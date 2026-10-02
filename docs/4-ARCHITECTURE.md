# Arsitektur & Komponen Sistem

```text
┌────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                               │
│  [Admin Web Dashboard]           [Tenant Public Views (No Auth)]       │
│  - Grid Kamar (Warna Status)     - Invoice Ringkas + QRIS Dinamis      │
│  - Form Check-In & Check-Out     - Mini-Ledger Kas Galon & Gas         │
│  - Input Nota Galon/Gas          - Form Tiket Komplain Kerusakan       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (JSON / REST API)
┌───────────────────────────────────▼────────────────────────────────────┐
│                             API GATEWAY                                │
│       Auth (JWT), Reverse Proxy, Rate Limiting, CORS Protection        │
└───────────────┬────────────────────────────────────────┬───────────────┘
                │                                        │
┌───────────────▼────────────────┐      ┌────────────────▼───────────────┐
│         CORE API SERVICE       │      │     REDIS DELAY QUEUE WORKER   │
│  - Logika Sewa & Kamar         │      │  - Timer Menunggu H-3          │
│  - Kalkulasi Prorata Check-Out │      │  - Auto-Chaining Bulan Depan   │
│  - Split Kas Galon/Gas         │      │  - Cancel Task saat Check-Out  │
└───────────────┬────────────────┘      └────────────────┬───────────────┘
                │                                        │
┌───────────────▼────────────────┐      ┌────────────────▼───────────────┐
│          DATA LAYER            │      │       EKSTERNAL SERVICE        │
│  - PostgreSQL (ACID Records)   │      │  - WA Gateway (Pesan Otomatis) │
│  - Redis (State Job Queue)     │      │  - Payment Gateway (QRIS)      │
│  - S3/Storage (Foto KTP)       │      │                                │
└────────────────────────────────┘      └────────────────────────────────┘
```