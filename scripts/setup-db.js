const { Pool } = require('pg');
// Sesuaikan dengan user/pass PostgreSQL lokal Anda
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bereskos',
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_number VARCHAR(10) NOT NULL, monthly_price DECIMAL(12, 2) NOT NULL, status VARCHAR(20) DEFAULT 'VACANT');
    CREATE TABLE IF NOT EXISTS tenants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, phone_number VARCHAR(20) NOT NULL, id_card_url TEXT);
    CREATE TABLE IF NOT EXISTS room_leases (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID REFERENCES rooms(id), tenant_id UUID REFERENCES tenants(id), start_date DATE NOT NULL, due_day_of_month INT NOT NULL, status VARCHAR(20) DEFAULT 'ACTIVE');
    
    -- Insert dummy room untuk testing
    INSERT INTO rooms (room_number, monthly_price) VALUES ('A1', 1200000) ON CONFLICT DO NOTHING;
  `);
  console.log('Sprint 1 Database Ready.');
  process.exit();
}
run();
