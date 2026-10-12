const express = require('express');
const path = require('node:path');
const { createSecurity, equal } = require('./services/auth');

function createApp({ pool, sendWA, apiRoutes, webhookRoutes, utilityRoutes, env = process.env }) {
  const app = express();
  const auth = createSecurity(pool, sendWA, env);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api/webhooks',
    (req, res, next) => {
      if (
        !env.XENDIT_CALLBACK_TOKEN ||
        !equal(req.get('x-callback-token'), env.XENDIT_CALLBACK_TOKEN)
      )
        return res.status(401).json({ error: 'Unauthorized' });
      next();
    },
    webhookRoutes
  );
  app.get('/api/public/rooms', async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, room_number, monthly_price, status, has_token_meter FROM rooms WHERE status = 'VACANT' ORDER BY room_number"
    );
    res.json(
      rows.map(({ id, room_number, monthly_price, status, has_token_meter }) => ({
        id,
        room_number,
        monthly_price,
        status,
        has_token_meter,
      }))
    );
  });
  app.use('/api', auth.router, auth.authenticate, auth.csrf);
  app.use('/api', (req, res, next) => {
    if (
      req.method === 'GET' &&
      ['/tenant/me', '/announcements', '/utilities/ledger'].includes(req.path)
    )
      return next();
    auth.admin(req, res, next);
  });
  app.use('/api/utilities', utilityRoutes);
  app.use('/api', apiRoutes);
  app.get('/uploads/:filename', auth.authenticate, async (req, res) => {
    if (!/^[a-f0-9]{32}$/.test(req.params.filename)) return res.sendStatus(404);
    if (req.session.role !== 'admin') {
      const url = `/uploads/${req.params.filename}`;
      const { rows } = await pool.query(
        `SELECT 1 FROM tenants WHERE id = ANY($1::uuid[]) AND id_card_url = $2 LIMIT 1`,
        [req.session.tenant_ids, url]
      );
      if (!rows.length) return res.sendStatus(404);
    }
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    res.sendFile(req.params.filename, {
      root: path.join(__dirname, '../uploads'),
      dotfiles: 'deny',
    });
  });
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Request failed' });
  });
  return app;
}
module.exports = createApp;
