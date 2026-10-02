const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.post('/payment', async (req, res) => {
  // Support payload dari Frontend (Dummy) ATAU Xendit (Real)
  const invoiceId = req.body.invoiceId || req.body.external_id;
  const status = req.body.status || 'PAID'; // Xendit mengirim status 'PAID' atau 'SETTLED'

  if (!invoiceId) return res.status(400).json({ error: 'Missing invoiceId / external_id' });
  if (status !== 'PAID' && status !== 'SETTLED') return res.json({ success: true, ignored: true });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      `UPDATE invoices SET status = 'PAID' WHERE id = $1 RETURNING id, lease_id`,
      [invoiceId]
    );
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    // Cari nomor kamar
    const roomRes = await client.query(
      `SELECT r.room_number FROM rooms r JOIN room_leases rl ON rl.room_id = r.id WHERE rl.id = $1`,
      [invRes.rows[0].lease_id]
    );
    const roomNumber = roomRes.rows[0]?.room_number || '?';

    // Tambah porsi kas dapur Rp 20.000 otomatis
    await client.query(`UPDATE shared_utility_pools SET balance = balance + 20000`);
    await client.query(
      `INSERT INTO utility_transactions (type, amount, notes) VALUES ('INFLOW', 20000, $1)`,
      [`Iuran utilitas via pembayaran sewa (Kamar ${roomNumber})`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Payment processed, utility pool updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
