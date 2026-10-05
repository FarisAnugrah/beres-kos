const { Worker, Queue } = require('bullmq');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const redisConn = require('../config/redis');
const { sendWA } = require('../services/wa');
const { createXenditInvoice } = require('../services/xendit');

console.log('Worker penagihan aktif, menunggu antrean H-3...');

// Inisialisasi ulang queue di dalam worker untuk auto-chaining
const billingQueue = new Queue('billing', { connection: redisConn });

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

      await billingQueue.add(
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

// =========================================================================
// CRON JOB: Auto-Cleanup File Sampah (KTP & Foto Bukti)
// Berjalan setiap tanggal 1 setiap bulannya jam 03:00 pagi.
// =========================================================================
cron.schedule('0 3 1 * *', async () => {
  console.log('[CRON] Menjalankan pembersihan file sampah (Garbage Collection)...');
  const client = await pool.connect();

  try {
    // 1. Hapus file KTP dari penyewa yang sudah CHECK-OUT (TERMINATED) lebih dari 3 bulan
    const { rows: expiredLeases } = await client.query(`
      SELECT t.id, t.id_card_url 
      FROM tenants t
      JOIN room_leases rl ON rl.tenant_id = t.id
      WHERE rl.status = 'TERMINATED' 
        AND rl.updated_at < NOW() - INTERVAL '3 months'
        AND t.id_card_url IS NOT NULL
    `);

    for (const lease of expiredLeases) {
      if (lease.id_card_url) {
        const filePath = path.join(__dirname, '../..', lease.id_card_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[CRON] Menghapus KTP kedaluwarsa: ${lease.id_card_url}`);
        }
        // Set URL jadi null agar tidak dipanggil lagi bulan depan
        await client.query(`UPDATE tenants SET id_card_url = NULL WHERE id = $1`, [lease.id]);
      }
    }

    // 2. Hapus file Foto Bukti Resolusi Tiket yang usianya sudah lebih dari 3 bulan
    const { rows: expiredTickets } = await client.query(`
      SELECT id, evidence_url 
      FROM tickets 
      WHERE status = 'RESOLVED' 
        AND updated_at < NOW() - INTERVAL '3 months'
        AND evidence_url IS NOT NULL
    `);

    for (const ticket of expiredTickets) {
      if (ticket.evidence_url) {
        const filePath = path.join(__dirname, '../..', ticket.evidence_url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[CRON] Menghapus Foto Bukti Tiket lama: ${ticket.evidence_url}`);
        }
        await client.query(`UPDATE tickets SET evidence_url = NULL WHERE id = $1`, [ticket.id]);
      }
    }

    console.log('[CRON] Pembersihan file sampah selesai!');
  } catch (err) {
    console.error('[CRON] Gagal melakukan auto-cleanup:', err.message);
  } finally {
    client.release();
  }
});
