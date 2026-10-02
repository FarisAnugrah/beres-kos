const { Worker } = require('bullmq');
const pool = require('../config/db');
const redisConn = require('../config/redis');
const { sendWA } = require('../services/wa');
const { createXenditInvoice } = require('../services/xendit');

console.log('Worker penagihan aktif, menunggu antrean H-3...');

const worker = new Worker(
  'billing',
  async (job) => {
    const { leaseId, dueDay } = job.data;
    const client = await pool.connect();

    try {
      // 1. Validasi DB: Pastikan status kontrak masih ACTIVE
      const { rows } = await client.query(
        `SELECT rl.status, r.monthly_price, r.room_number, t.phone_number, t.name 
         FROM room_leases rl 
         JOIN rooms r ON rl.room_id = r.id 
         JOIN tenants t ON rl.tenant_id = t.id
         WHERE rl.id = $1`,
        [leaseId]
      );

      if (!rows.length || rows[0].status !== 'ACTIVE') return;

      const tenant = rows[0];
      const totalBilled = parseFloat(tenant.monthly_price) + 20000; // Sewa + Galon

      await client.query('BEGIN');

      // 2. Generate Invoice Baru
      const invRes = await client.query(
        `INSERT INTO invoices (lease_id, total_amount) VALUES ($1, $2) RETURNING id`,
        [leaseId, totalBilled]
      );
      const invoiceId = invRes.rows[0].id;

      await client.query('COMMIT');

      // 3. Generate Link Xendit & Kirim pesan tagihan ke WA
      let paymentLink = 'Hubungi Admin untuk pembayaran tunai/transfer.';
      const xenditUrl = await createXenditInvoice(
        invoiceId,
        totalBilled,
        tenant.name,
        tenant.room_number
      );
      if (xenditUrl) paymentLink = xenditUrl;

      const waMsg = `Halo ${tenant.name},\n\nIni adalah pengingat tagihan bulanan BeresKos untuk Kamar ${tenant.room_number}.\n\nJatuh tempo: Tanggal ${dueDay}\nTotal: *Rp ${totalBilled.toLocaleString('id-ID')}*\n(Sewa Kamar + Kas Dapur Rp20.000)\n\nHarap lakukan pembayaran via Link Resmi berikut:\n${paymentLink}\n\nCek transparansi kas: http://localhost:3001/tenant`;
      await sendWA(tenant.phone_number, waMsg);

      // 4. AUTO-CHAINING: Jadwalkan tiket untuk bulan depan
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(dueDay - 3);

      await job.queue.add(
        'monthly-bill',
        { leaseId, dueDay },
        { delay: Math.max(0, nextMonth.getTime() - Date.now()), jobId: leaseId }
      );
      console.log(
        `[Worker] Selesai. Tagihan bulan depan disiapkan untuk kamar ${tenant.room_number}.`
      );
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
