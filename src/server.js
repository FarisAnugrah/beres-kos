const createApp = require('./app');
const pool = require('./config/db');
const { sendWA } = require('./services/wa');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhooks');
const utilityRoutes = require('./routes/utilities');
require('./workers/billingWorker');

const app = createApp({ pool, sendWA, apiRoutes, webhookRoutes, utilityRoutes });
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API jalan di port ${PORT}`));
