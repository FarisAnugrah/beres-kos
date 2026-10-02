const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.post('/payment', async (req, res) => {
  const { invoiceId } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      `UPDATE invoices SET status = 'PAID' WHERE id = $1 RETURNING id`,
      [invoiceId]
    );
    if (!invRes.rows.length) return res.status(404).json({ error: 'Invoice not found' });

    // Tambah porsi kas dapur Rp 20.000 otomatis
    await client.query(`UPDATE shared_utility_pools SET balance = balance + 20000`);
    await client.query(
      `INSERT INTO utility_transactions (type, amount, notes) VALUES ('INFLOW', 20000, 'Iuran utilitas via pembayaran sewa')`
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
