# 1-DATABASE.md (PostgreSQL Schema)

```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number VARCHAR(10) NOT NULL,
    monthly_price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'VACANT'
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    id_card_url TEXT
);

CREATE TABLE room_leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id),
    tenant_id UUID REFERENCES tenants(id),
    start_date DATE NOT NULL,
    due_day_of_month INT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE shared_utility_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance DECIMAL(12, 2) DEFAULT 0.00
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES room_leases(id),
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'UNPAID'
);
```