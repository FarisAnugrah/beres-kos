# 2-WORKER-BULLMQ.md (Redis Delay Queue)

```javascript
const { Queue, Worker } = require('bullmq');
const billingQueue = new Queue('billing', { connection: { host: '127.0.0.1', port: 6379 } });

// Worker terpisah untuk mengeksekusi tagihan (Siklus B)
new Worker('billing', async (job) => {
  const { leaseId, dueDay } = job.data;
  
  // 1. Validasi DB
  const { rows } = await db.query(`SELECT status FROM room_leases WHERE id=$1`, [leaseId]);
  if (rows[0]?.status !== 'ACTIVE') return;

  // 2. Generate Invoice & Kirim WA
  await db.query(`INSERT INTO invoices (lease_id, total_amount) VALUES ($1, ...)`, [leaseId]);
  // postToWhatsAppAPI();

  // 3. Auto-Chaining bulan depan
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(dueDay - 3); 
  
  await billingQueue.add('monthly-bill', { leaseId, dueDay }, { 
    delay: nextMonth.getTime() - Date.now(), 
    jobId: leaseId 
  });
});
```