# 1. Konsep & Value Proposition
- **Target:** Pemilik kos mandiri (5–50 kamar).
- **Prinsip Utama:** Zero-friction (tanpa download aplikasi, murni WhatsApp & Web responsif).
- **Solusi Inti:** Penagihan otomatis, transparansi kas utilitas dapur (galon/gas), dan check-out prorata tanpa deposit.

# 2. Tiga Siklus Alur Operasional Utama

## A. Check-In
Admin Web Form (Pilih kamar, input data, bayar) -> Backend ubah status `OCCUPIED` -> Daftarkan tagihan H-3 ke Redis -> WA Bot kirim ucapan selamat datang & tata tertib.

## B. Penagihan (Otomatis)
Redis Queue meledak di H-3 -> Worker cek DB -> Generate Invoice -> WA Bot kirim tagihan & QRIS -> Jadwalkan otomatis tiket bulan depan (Auto-chaining). Saat dibayar, kas galon otomatis dipisah.

## C. Check-Out (Prorata)
Anak kos keluar -> Admin input tanggal. 
- Keluar Tgl 1-5: Rp 50.000/hari.
- Keluar Tgl >5: Full 1 bulan.
Admin konfirmasi -> Hapus tiket tagihan dari Redis -> Status kamar kembali `VACANT`.

# 3. Roadmap MVP
- **Sprint 1 (Core):** Setup DB, API, Visual Grid Kamar, Form Check-In.
- **Sprint 2 (Automasi):** Setup BullMQ, Webhook WA (Tagihan), Auto-chaining tiket bulanan.
- **Sprint 3 (Transparansi):** Input nota belanja, Webview Ledger Publik untuk Kas Dapur.
- **Sprint 4 (Penyelesaian):** Hitung otomatis prorata Check-Out, hapus job Redis.