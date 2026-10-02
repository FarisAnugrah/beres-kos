# 3-API-ROUTES.md (Express Monolith)

```javascript
const express = require('express');
const app = express();

// SIKLUS A: Check-In
app.post('/api/checkin', async (req, res) => {
  // Insert Tenant & Lease, Update Room OCCUPIED
  const hMinus3Ms = calculateDelayMs(req.body.dueDay - 3);
  
  await billingQueue.add('monthly-bill', { 
    leaseId: req.body.leaseId, 
    dueDay: req.body.dueDay 
  }, { 
    delay: hMinus3Ms, 
    jobId: req.body.leaseId // Kunci untuk pembatalan
  });
  
  res.json({ ok: true });
});

// SIKLUS C: Check-Out
app.post('/api/checkout', async (req, res) => {
  const { leaseId, roomId, checkoutDay, monthlyPrice } = req.body;
  const bill = checkoutDay <= 5 ? checkoutDay * 50000 : monthlyPrice;
  
  await db.query(`UPDATE room_leases SET status='TERMINATED' WHERE id=$1`, [leaseId]);
  await db.query(`UPDATE rooms SET status='VACANT' WHERE id=$1`, [roomId]);
  
  // Hapus tiket redis agar tagihan bulan depan tidak jalan
  const job = await billingQueue.getJob(leaseId);
  if (job) await job.remove();
  
  res.json({ final_bill: bill });
});
```