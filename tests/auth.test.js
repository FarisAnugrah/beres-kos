const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const express = require('express');
const createApp = require('../src/app');
const { normalizePhone, hash } = require('../src/services/auth');

const env = {
  APP_ORIGIN: 'http://localhost:3001',
  ADMIN_PASSWORD: 'test-password-long-enough',
  OTP_SECRET: 'test-only-secret-that-is-at-least-32-bytes',
  XENDIT_CALLBACK_TOKEN: 'test-callback',
};
function database() {
  const state = { sessions: new Map(), otp: null, rates: new Map(), queries: [] };
  const pool = {
    async query(sql, args = []) {
      state.queries.push([sql, args]);
      if (sql.includes('INSERT INTO auth_rate_limits')) {
        const count = (state.rates.get(args[0]) || 0) + 1;
        state.rates.set(args[0], count);
        return { rows: [{ count }] };
      }
      if (sql.includes('INSERT INTO auth_sessions'))
        state.sessions.set(args[0], { role: args[1], tenant_ids: args[2] });
      if (sql.includes('DELETE FROM auth_sessions')) state.sessions.delete(args[0]);
      if (sql.includes('SELECT role, tenant_ids'))
        return {
          rows:
            state.sessions.has(args[0]) && !state.sessions.get(args[0]).expired
              ? [structuredClone(state.sessions.get(args[0]))]
              : [],
        };
      if (sql.includes('SELECT DISTINCT tenant_id'))
        return { rows: args[0].map((tenant_id) => ({ tenant_id })) };
      if (sql.includes('SELECT DISTINCT t.id')) return { rows: [{ id: 'tenant-a' }] };
      if (sql.includes('INSERT INTO auth_otps'))
        state.otp = {
          phone: args[0],
          code_hash: args[1],
          tenant_ids: args[2],
          valid: true,
          ready: false,
          attempts: 0,
        };
      if (sql.includes('SET ready = true') && state.otp) state.otp.ready = true;
      if (sql.includes('FROM auth_otps') && sql.includes('FOR UPDATE'))
        return { rows: state.otp ? [structuredClone(state.otp)] : [] };
      if (sql.includes('SET attempts = attempts + 1')) state.otp.attempts++;
      if (sql.includes('DELETE FROM auth_otps')) state.otp = null;
      if (sql.includes('FROM rooms WHERE'))
        return {
          rows: [
            {
              id: 'room',
              room_number: 'A1',
              monthly_price: 100,
              status: 'VACANT',
              has_token_meter: false,
              tenant_name: 'PRIVATE',
              id_card_url: 'PRIVATE',
              nik: 'PRIVATE',
            },
          ],
        };
      return { rows: [] };
    },
    async connect() {
      return { query: pool.query, release() {} };
    },
  };
  return { pool, state };
}
async function fixture(t, send = async () => true, config = env) {
  const { pool, state } = database();
  const apiRoutes = express.Router();
  apiRoutes.get('/tenant/me', (req, res) => res.json({ tenant_ids: req.session.tenant_ids }));
  apiRoutes.use((req, res) => res.json({ success: true }));
  const webhookRoutes = express
    .Router()
    .post('/payment', (req, res) => res.json({ success: true }));
  const app = createApp({
    pool,
    sendWA: send,
    apiRoutes,
    webhookRoutes,
    utilityRoutes: express.Router(),
    env: config,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (path, options = {}) =>
    fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
  const post = (path, body, cookie) =>
    request(path, {
      method: 'POST',
      headers: {
        origin: env.APP_ORIGIN,
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  return { state, request, post };
}

test('admin APIs and documents reject missing and forged cookies', async (t) => {
  const { request } = await fixture(t);
  for (const path of [
    '/api/rooms',
    '/api/export-csv?type=tenants',
    '/api/tickets',
    '/uploads/' + 'a'.repeat(32),
  ]) {
    for (const cookie of ['', 'auth_token=authenticated', 'bereskos_session=' + 'a'.repeat(64)]) {
      assert.equal((await request(path, { headers: { cookie } })).status, 401);
    }
  }
});
test('login issues hashed session, logout revokes it, login rate limits', async (t) => {
  const { state, post, request } = await fixture(t);
  const response = await post('/api/auth/login', { password: env.ADMIN_PASSWORD });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.ok(state.sessions.has(hash(cookie.split('=')[1])));
  assert.equal((await request('/api/rooms', { headers: { cookie } })).status, 200);
  assert.equal((await post('/api/auth/logout', {}, cookie)).status, 200);
  assert.equal((await request('/api/rooms', { headers: { cookie } })).status, 401);
  for (let i = 0; i < 9; i++) await post('/api/auth/login', { password: 'wrong' });
  assert.equal((await post('/api/auth/login', { password: env.ADMIN_PASSWORD })).status, 429);
});
test('missing config and invalid origins fail closed; callback token required without origin', async (t) => {
  const { request, post } = await fixture(t, undefined, { APP_ORIGIN: env.APP_ORIGIN });
  assert.equal((await post('/api/auth/login', { password: 'admin123' })).status, 503);
  assert.equal((await request('/api/auth/login', { method: 'POST' })).status, 403);
  assert.equal((await request('/api/webhooks/payment', { method: 'POST' })).status, 401);
  const valid = await fixture(t);
  assert.equal(
    (
      await valid.request('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'x-callback-token': env.XENDIT_CALLBACK_TOKEN },
      })
    ).status,
    200
  );
});
test('session validation requires database expiry and rejects expired records', async (t) => {
  const { request, state } = await fixture(t);
  state.sessions.set(hash('d'.repeat(64)), { role: 'admin', tenant_ids: [], expired: true });
  const response = await request('/api/auth/session', {
    headers: { cookie: 'bereskos_session=' + 'd'.repeat(64) },
  });
  assert.equal(response.status, 401);
  assert.ok(
    state.queries.some(
      ([sql]) => sql.includes('SELECT role, tenant_ids') && sql.includes('expires_at > NOW()')
    )
  );
});

test('public rooms explicitly omit all PII', async (t) => {
  const { request } = await fixture(t);
  const response = await request('/api/public/rooms');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys((await response.json())[0]).sort(), [
    'has_token_meter',
    'id',
    'monthly_price',
    'room_number',
    'status',
  ]);
});
test('tenant cannot access admin APIs or another tenant document; query phone cannot change identity', async (t) => {
  const { request, state, post } = await fixture(t);
  const token = 'b'.repeat(64);
  state.sessions.set(hash(token), { role: 'tenant', tenant_ids: ['tenant-a'] });
  const cookie = `bereskos_session=${token}`;
  assert.equal((await request('/api/rooms', { headers: { cookie } })).status, 403);
  assert.equal((await post('/api/utilities/expense', { amount: 1 }, cookie)).status, 403);
  assert.equal((await request('/uploads/' + 'a'.repeat(32), { headers: { cookie } })).status, 404);
  assert.deepEqual(
    await (await request('/api/tenant/me?phone=628999999999', { headers: { cookie } })).json(),
    { tenant_ids: ['tenant-a'] }
  );
});
test('OTP uses exact normalized phone, hash, cooldown, expiry, bounded attempts and single use', async (t) => {
  let code;
  const { post, state } = await fixture(t, async (phone, message) => {
    code = message.match(/\d{6}/)[0];
    return true;
  });
  assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890');
  assert.equal(normalizePhone('081234567890'), '6281234567890');
  assert.equal(normalizePhone('34567890'), null);
  const phone = '081234567890';
  assert.equal((await post('/api/tenant/request-otp', { phone })).status, 200);
  assert.notEqual(state.otp.code_hash, code);
  assert.ok(
    state.queries.some(
      ([sql, args]) =>
        sql.includes('SELECT DISTINCT t.id') &&
        sql.includes(' = $1') &&
        !sql.includes('LIKE') &&
        args[0] === '6281234567890'
    )
  );
  assert.equal((await post('/api/tenant/request-otp', { phone })).status, 429);
  state.otp.valid = false;
  assert.equal((await post('/api/tenant/verify-otp', { phone, otp: code })).status, 400);
  state.otp.valid = true;
  state.otp.attempts = 0;
  for (let i = 0; i < 5; i++)
    assert.equal((await post('/api/tenant/verify-otp', { phone, otp: '000000' })).status, 400);
  assert.equal((await post('/api/tenant/verify-otp', { phone, otp: code })).status, 400);
  state.otp.attempts = 0;
  assert.equal((await post('/api/tenant/verify-otp', { phone, otp: code })).status, 200);
  assert.equal(state.otp, null);
  assert.equal((await post('/api/tenant/verify-otp', { phone, otp: code })).status, 400);
});
test('real tenant profile route scopes SQL to session IDs, never query phone', async (t) => {
  const queries = [];
  const pool = {
    async query(sql, args) {
      queries.push([sql, args]);
      if (sql.includes('SELECT role, tenant_ids'))
        return { rows: [{ role: 'tenant', tenant_ids: ['tenant-a'] }] };
      if (sql.includes('SELECT DISTINCT tenant_id')) return { rows: [{ tenant_id: 'tenant-a' }] };
      if (sql.includes('SELECT rl.id as lease_id'))
        return { rows: [{ lease_id: 'lease-a', name: 'A' }] };
      return { rows: [] };
    },
  };
  const original = Module._load;
  let apiRoutes;
  try {
    Module._load = function (id, ...args) {
      if (id === '../config/db') return pool;
      if (id === '../config/redis') return {};
      if (id === 'bullmq') return { Queue: class {} };
      if (id === '../services/wa' || id === '../services/xendit') return {};
      return original.call(this, id, ...args);
    };
    delete require.cache[require.resolve('../src/routes/api')];
    apiRoutes = require('../src/routes/api');
  } finally {
    Module._load = original;
  }
  const app = createApp({
    pool,
    sendWA: async () => false,
    apiRoutes,
    webhookRoutes: express.Router(),
    utilityRoutes: express.Router(),
    env,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/tenant/me?phone=628999999999`,
    { headers: { cookie: 'bereskos_session=' + 'c'.repeat(64) } }
  );
  assert.equal(response.status, 200);
  const lease = queries.find(([sql]) => sql.includes('SELECT rl.id as lease_id'));
  assert.match(lease[0], /t.id = ANY\(\$1::uuid\[\]\)/);
  assert.deepEqual(lease[1], [['tenant-a']]);
  assert.deepEqual(queries.find(([sql]) => sql.includes('WHERE lease_id = $1'))[1], ['lease-a']);
});

test('OTP delivery failure invalidates challenge', async (t) => {
  const { post, state } = await fixture(t, async () => false);
  assert.equal((await post('/api/tenant/request-otp', { phone: '081234567890' })).status, 503);
  assert.equal(state.otp, null);
});
