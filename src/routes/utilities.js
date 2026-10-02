const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Public Ledger API (Bisa diakses tanpa login/auth)
router.get('/ledger', async (req, res) => {
  try {
    const poolRes = await pool.query(`SELECT balance FROM shared_utility_pools LIMIT 1`);
    const txRes = await pool.query(
      `SELECT * FROM utility_transactions ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      balance: poolRes.rows[0]?.balance || 0,
      transactions: txRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin input pengeluaran (Cth: Beli Galon/Gas)
router.post('/expense', async (req, res) => {
  const { amount, notes } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`UPDATE shared_utility_pools SET balance = balance - $1`, [amount]);
    await client.query(
      `INSERT INTO utility_transactions (type, amount, notes) VALUES ('OUTFLOW', $1, $2)`,
      [amount, notes]
    );
    await client.query('COMMIT');

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
