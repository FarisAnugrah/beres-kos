const express = require('express');
const { Queue } = require('bullmq');
const multer = require('multer');
const pool = require('../config/db');
const redisConn = require('../config/redis');

const router = express.Router();
const billingQueue = new Queue('billing', { connection: redisConn });
const upload = multer({ dest: 'uploads/' });

// Endpoint list kamar + status kontrak aktif
router.get('/rooms', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.*, rl.id as active_lease_id, t.name as tenant_name 
      FROM rooms r 
      LEFT JOIN room_leases rl ON r.id = rl.room_id AND rl.status = 'ACTIVE'
      LEFT JOIN tenants t ON rl.tenant_id = t.id
      ORDER BY r.room_number ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkin', upload.single('ktp'), async (req, res) => {
  const { roomId, name, phone, dueDay, startDate } = req.body;
  const ktpUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      `INSERT INTO tenants (name, phone_number, id_card_url) VALUES ($1, $2, $3) RETURNING id`,
      [name, phone, ktpUrl]
    );
    const tenantId = tenantRes.rows[0].id;

    const leaseRes = await client.query(
      `INSERT INTO room_leases (room_id, tenant_id, start_date, due_day_of_month) VALUES ($1, $2, $3, $4) RETURNING id`,
      [roomId, tenantId, startDate, dueDay]
    );
    const leaseId = leaseRes.rows[0].id;

    await client.query(`UPDATE rooms SET status = 'OCCUPIED' WHERE id = $1`, [roomId]);

    await client.query('COMMIT');

    const targetDate = new Date();
    targetDate.setDate(dueDay - 3);
    const delayMs = Math.max(0, targetDate.getTime() - Date.now());

    await billingQueue.add('monthly-bill', { leaseId, dueDay }, { delay: delayMs, jobId: leaseId });

    res.json({ success: true, leaseId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/checkout', async (req, res) => {
  const { leaseId } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ambil data sewa dan harga kamar
    const { rows } = await client.query(
      `SELECT rl.room_id, r.monthly_price, rl.status FROM room_leases rl JOIN rooms r ON rl.room_id = r.id WHERE rl.id = $1`,
      [leaseId]
    );

    if (!rows.length || rows[0].status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Kontrak tidak ditemukan atau sudah tidak aktif' });
    }

    const { room_id, monthly_price } = rows[0];
    const checkoutDay = new Date().getDate(); // Tanggal hari ini

    // 2. Hitung Prorata (<= 5 hari = 50rb/hari, > 5 hari = Harga Full)
    const finalBill = checkoutDay <= 5 ? checkoutDay * 50000 : monthly_price;

    // 3. Update Status Kamar & Kontrak
    await client.query(`UPDATE room_leases SET status = 'TERMINATED' WHERE id = $1`, [leaseId]);
    await client.query(`UPDATE rooms SET status = 'VACANT' WHERE id = $1`, [room_id]);

    // 4. Buat invoice terakhir
    if (finalBill > 0) {
      await client.query(
        `INSERT INTO invoices (lease_id, total_amount, status) VALUES ($1, $2, 'UNPAID')`,
        [leaseId, finalBill]
      );
    }

    await client.query('COMMIT');

    // 5. Batalkan tiket antrean penagihan otomatis di Redis
    const pendingJob = await billingQueue.getJob(leaseId);
    if (pendingJob) await pendingJob.remove();

    res.json({ success: true, finalBill, message: 'Check-out berhasil. Tagihan bulanan distop.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
