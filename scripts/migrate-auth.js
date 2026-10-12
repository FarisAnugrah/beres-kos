const { Pool } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`
      BEGIN;
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash TEXT PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('admin', 'tenant')),
        tenant_ids UUID[] NOT NULL DEFAULT '{}',
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions (expires_at);
      CREATE TABLE IF NOT EXISTS auth_otps (
        phone TEXT PRIMARY KEY,
        code_hash TEXT NOT NULL,
        tenant_ids UUID[] NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        ready BOOLEAN NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at TIMESTAMPTZ NOT NULL
      );
      COMMIT;
    `);
  } finally {
    await pool.end();
  }
}
if (require.main === module)
  migrate().catch(() => {
    console.error('Auth migration failed');
    process.exitCode = 1;
  });
module.exports = migrate;
