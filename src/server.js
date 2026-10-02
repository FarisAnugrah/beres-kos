const express = require('express');
const apiRoutes = require('./routes/api');

const app = express();
app.use(express.json());

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API jalan di port ${PORT}`));