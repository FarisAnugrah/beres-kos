const crypto = require('node:crypto');
const express = require('express');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const equal = (a, b) =>
  typeof a === 'string' &&
  typeof b === 'string' &&
  crypto.timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const normalizePhone = (value) => {
  if (typeof value !== 'string' || !/^[+\d ()-]{9,24}$/.test(value)) return null;
  const phone = value.replace(/\D/g, '').replace(/^0/, '62');
  return /^628\d{7,11}$/.test(phone) ? phone : null;
};
const phoneSQL = "REGEXP_REPLACE(REGEXP_REPLACE(t.phone_number, '[^0-9]', '', 'g'), '^0', '62')";
const cookieName = 'bereskos_session';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function createSecurity(pool, sendWA, env = process.env) {
  const router = express.Router();
  const token = (req) => {
    const value = (req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
  };
  const csrf = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (!env.APP_ORIGIN || req.get('origin') !== env.APP_ORIGIN)
      return res.status(403).json({ error: 'Invalid origin' });
    next();
  };
  const authenticate = async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const value = token(req);
    if (!value) return res.status(401).json({ error: 'Unauthorized' });
    const { rows } = await pool.query(
      `SELECT role, tenant_ids FROM auth_sessions WHERE token_hash = $1 AND expires_at > NOW()`,
      [hash(value)]
    );
    if (!rows.length) return res.status(401).json({ error: 'Unauthorized' });
    req.session = rows[0];
    if (req.session.role === 'tenant') {
      const active = await pool.query(
        `SELECT DISTINCT tenant_id FROM room_leases WHERE tenant_id = ANY($1::uuid[]) AND status = 'ACTIVE'`,
        [req.session.tenant_ids]
      );
      req.session.tenant_ids = active.rows.map((r) => r.tenant_id);
      if (!req.session.tenant_ids.length) return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
  const admin = (req, res, next) =>
    req.session?.role === 'admin' ? next() : res.status(403).json({ error: 'Forbidden' });
  const rate = async (key, limit, seconds) => {
    const { rows } = await pool.query(
      `INSERT INTO auth_rate_limits (key, count, reset_at) VALUES ($1, 1, NOW() + $2 * INTERVAL '1 second') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN auth_rate_limits.reset_at <= NOW() THEN 1 ELSE auth_rate_limits.count + 1 END, reset_at = CASE WHEN auth_rate_limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE auth_rate_limits.reset_at END RETURNING count`,
      [hash(key), seconds]
    );
    return rows[0].count <= limit;
  };
  const issue = async (req, res, role, ids = [], db = pool) => {
    const value = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO auth_sessions (token_hash, role, tenant_ids, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '8 hours')`,
      [hash(value), role, ids]
    );
    if (token(req))
      await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hash(token(req))]);
    return value;
  };
  const setCookie = (res, value) =>
    res.cookie(cookieName, value, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
  router.use(csrf);
  router.post('/auth/login', async (req, res) => {
    if (!(await rate(`admin:${req.ip}`, 10, 900)))
      return res.status(429).json({ error: 'Try again later' });
    if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16)
      return res.status(503).json({ error: 'Login unavailable' });
    if (
      typeof req.body?.password !== 'string' ||
      req.body?.password.length > 1024 ||
      !equal(req.body?.password, env.ADMIN_PASSWORD)
    )
      return res.status(401).json({ error: 'Invalid credentials' });
    setCookie(res, await issue(req, res, 'admin'));
    res.json({ success: true });
  });
  router.post('/auth/logout', async (req, res) => {
    if (token(req))
      await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hash(token(req))]);
    res.clearCookie(cookieName, cookieOptions);
    res.json({ success: true });
  });
  router.get('/auth/session', authenticate, (req, res) => res.json({ role: req.session.role }));
  router.post('/tenant/request-otp', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!phone) return res.status(400).json({ error: 'Invalid phone' });
    if (!env.OTP_SECRET || env.OTP_SECRET.length < 32)
      return res.status(503).json({ error: 'Login unavailable' });
    if (
      !(await rate(`otp-ip:${req.ip}`, 10, 900)) ||
      !(await rate(`otp-phone:${phone}`, 1, 60)) ||
      !(await rate(`otp-hour:${phone}`, 5, 3600))
    )
      return res.status(429).json({ error: 'Try again later' });
    const { rows } = await pool.query(
      `SELECT DISTINCT t.id FROM tenants t JOIN room_leases rl ON rl.tenant_id = t.id WHERE rl.status = 'ACTIVE' AND ${phoneSQL} = $1`,
      [phone]
    );
    if (!rows.length) return res.json({ success: true, cleanPhone: phone });
    const otp = crypto.randomInt(100000, 1000000).toString();
    const digest = crypto
      .createHmac('sha256', env.OTP_SECRET)
      .update(`${phone}:${otp}`)
      .digest('hex');
    await pool.query(
      `INSERT INTO auth_otps (phone, code_hash, tenant_ids, expires_at, attempts, ready) VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', 0, false) ON CONFLICT (phone) DO UPDATE SET code_hash = EXCLUDED.code_hash, tenant_ids = EXCLUDED.tenant_ids, expires_at = EXCLUDED.expires_at, attempts = 0, ready = false`,
      [phone, digest, rows.map((r) => r.id)]
    );
    let sent = false;
    try {
      sent = await sendWA(
        phone,
        `Kode OTP BeresKos: ${otp}. Berlaku 5 menit. Jangan bagikan kode ini.`
      );
    } catch {}
    if (!sent) {
      await pool.query('DELETE FROM auth_otps WHERE phone = $1 AND code_hash = $2', [
        phone,
        digest,
      ]);
      return res.status(503).json({ error: 'Delivery unavailable' });
    }
    await pool.query('UPDATE auth_otps SET ready = true WHERE phone = $1 AND code_hash = $2', [
      phone,
      digest,
    ]);
    res.json({ success: true, cleanPhone: phone });
  });
  router.post('/tenant/verify-otp', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!phone || typeof req.body?.otp !== 'string' || !/^\d{6}$/.test(req.body?.otp))
      return res.status(400).json({ error: 'Invalid code' });
    if (!env.OTP_SECRET || env.OTP_SECRET.length < 32)
      return res.status(503).json({ error: 'Login unavailable' });
    if (!(await rate(`verify:${req.ip}`, 30, 900)))
      return res.status(429).json({ error: 'Try again later' });
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const { rows } = await db.query(
        'SELECT *, expires_at > NOW() AS valid FROM auth_otps WHERE phone = $1 FOR UPDATE',
        [phone]
      );
      const row = rows[0];
      const digest = crypto
        .createHmac('sha256', env.OTP_SECRET)
        .update(`${phone}:${req.body?.otp}`)
        .digest('hex');
      if (!row || !row.ready || !row.valid || row.attempts >= 5 || !equal(row.code_hash, digest)) {
        if (row)
          await db.query('UPDATE auth_otps SET attempts = attempts + 1 WHERE phone = $1', [phone]);
        await db.query('COMMIT');
        return res.status(400).json({ error: 'Invalid or expired code' });
      }
      await db.query('DELETE FROM auth_otps WHERE phone = $1', [phone]);
      const value = await issue(req, res, 'tenant', row.tenant_ids, db);
      await db.query('COMMIT');
      setCookie(res, value);
      res.json({ success: true });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    } finally {
      db.release();
    }
  });
  return { router, csrf, authenticate, admin };
}
module.exports = { createSecurity, normalizePhone, phoneSQL, equal, hash };
