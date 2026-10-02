# V2 Roadmap (Future Improvements)

Jika MVP (Minimum Viable Product) ini dirasa sudah berjalan stabil, berikut adalah daftar fitur yang bisa ditambahkan di fase pengembangan V2 untuk membuat sistem BeresKos lebih canggih dan *scalable*.

## 1. Otentikasi & Keamanan (Admin Panel)
- **JWT Login / NextAuth:** Saat ini dasbor `http://localhost:3001` terbuka tanpa *password* (asumsi hanya jalan di komputer lokal). Jika akan di-hosting ke internet (seperti Vercel), wajib ditambahkan halaman *Login* dengan sistem *Session/Cookie*.
- **Role-Based Access Control (RBAC):** Memisahkan akses antara "Pemilik Kos" (Bisa lihat saldo masuk) dan "Penjaga/Admin Kos" (Hanya bisa proses komplain kerusakan dan lihat kamar kosong).

## 2. Peningkatan Fitur Penagihan & Keuangan
- **Auto-Split Disbursement Xendit:** Saat ini saldo kas bertambah di _Dashboard_, namun uang fisiknya masih menyatu di akun Xendit. Bisa diintegrasikan fitur *Xendit xenPlatform* agar saat anak kos bayar Rp 1.220.000, Xendit otomatis memecah uangnya: Rp 1.2M masuk ke rekening A (Pemilik Kos), dan Rp 20rb masuk ke rekening B (Pengurus Dapur).
- **Export Laporan (CSV/PDF):** Tombol di dasbor untuk mengunduh rekap keuangan bulanan yang rapi untuk diserahkan ke investor atau kantor pajak.
- **Denda Keterlambatan Otomatis:** Jika lewat H+3 dari tanggal jatuh tempo, worker BullMQ otomatis meng-_update_ invoice menjadi +Rp 50.000 (Denda Telat Bayar) dan mengirim peringatan WA tahap 2.

## 3. Fitur WhatsApp Bot Lanjutan
- **Broadcast Pengumuman:** Admin bisa mengetik pesan di Dasbor ("Besok air mati jam 9 pagi"), lalu bot WA otomatis menembak pesan tersebut (Broadcast) ke seluruh penghuni kos yang berstatus `ACTIVE`.
- **Upload Bukti Perbaikan:** Saat Admin mengklik "Tandai Selesai" pada tiket komplain, Admin bisa melampirkan foto nota/hasil perbaikan, dan foto tersebut ikut dikirim via WA ke anak kos.
- **Integrasi LLM/AI (ChatGPT):** Bot WA bisa menjawab pertanyaan calon anak kos secara otomatis (Misal: "Ada kamar kosong kak? Harganya berapa?").

## 4. Manajemen Properti Tambahan
- **Daftar Tunggu (Waiting List):** Calon penyewa mendaftar via web publik. Saat ada penghuni yang Check-Out, sistem nge-WA pendaftar antrean pertama secara otomatis.
- **Kalkulator Deposit / Barang Rusak:** Saat Check-Out, selain Prorata, ada menu untuk mendenda barang (Misal: Kunci Hilang - Rp 50.000, Seprei Robek - Rp 100.000) yang dimasukkan ke tagihan invoice terakhir.