const express = require('express');
const { Queue } = require('bullmq');
const pool = require('../config/db');
const redisConn = require('../config/redis');

const router = express.Router();
const billingQueue = new Queue('billing', { connection: redisConn });

router.post('/checkin', async (req, res) => {
  const { roomId, name, phone, dueDay, startDate } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      `INSERT INTO tenants (name, phone_number) VALUES ($1, $2) RETURNING id`,
      [name, phone]
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

module.exports = router;
