const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');
const utilityRoutes = require('./routes/utilities');

const app = express();
app.use(express.json());

// Serve folder public (UI Frontend)
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', apiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/utilities', utilityRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API jalan di port ${PORT}`));
