const { Worker } = require('bullmq');
const pool = require('../config/db');
const redisConn = require('../config/redis');

console.log('Worker penagihan aktif, menunggu antrean H-3...');

const worker = new Worker(
  'billing',
  async (job) => {
    const { leaseId, dueDay } = job.data;
    const client = await pool.connect();

    try {
      // 1. Validasi DB: Pastikan status kontrak masih ACTIVE
      const { rows } = await client.query(
        `SELECT rl.status, r.monthly_price FROM room_leases rl JOIN rooms r ON rl.room_id = r.id WHERE rl.id = $1`,
        [leaseId]
      );

      if (!rows.length || rows[0].status !== 'ACTIVE') return;

      await client.query('BEGIN');

      // 2. Generate Invoice Baru
      await client.query(`INSERT INTO invoices (lease_id, total_amount) VALUES ($1, $2)`, [
        leaseId,
        rows[0].monthly_price,
      ]);

      await client.query('COMMIT');

      // 3. Dummy: Kirim pesan tagihan + QRIS ke WA
      console.log(`[WA] Mengirim invoice Rp ${rows[0].monthly_price} ke penyewa...`);

      // 4. AUTO-CHAINING: Jadwalkan tiket untuk bulan depan
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(dueDay - 3);

      await job.queue.add(
        'monthly-bill',
        { leaseId, dueDay },
        { delay: Math.max(0, nextMonth.getTime() - Date.now()), jobId: leaseId }
      );
      console.log(`[Worker] Selesai. Tagihan bulan depan disiapkan.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      throw err;
    } finally {
      client.release();
    }
  },
  { connection: redisConn }
);

worker.on('failed', (job, err) => console.error(`Job ${job.id} error:`, err));
