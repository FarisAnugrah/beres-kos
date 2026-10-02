const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const pool = require('../config/db');

console.log('[WA] Menginisialisasi Bot WhatsApp...');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

let isReady = false;

client.on('qr', (qr) => {
  console.log('\n=============================================');
  console.log('[WA] SCAN QR CODE INI MENGGUNAKAN WHATSAPP ANDA:');
  console.log('=============================================\n');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[WA] Client is ready! Bot WhatsApp berhasil terhubung.');
  isReady = true;
});

// Listener untuk memproses laporan kerusakan dari tenant
client.on('message', async (msg) => {
  const body = msg.body.trim();
  if (body.toUpperCase().startsWith('LAPOR ')) {
    const laporan = body.substring(6).trim();
    const sender = msg.from.replace('@c.us', ''); // Format: 628...

    try {
      // Cari penyewa aktif berdasarkan nomor WA
      // Karena input Admin mungkin bervariasi (0812.., 6281.., +6281..), dan sender WA selalu '6281...'
      // Kita normalisasi dengan membuang angka non-digit dan mengambil 8-10 digit terakhir saja.
      const cleanSender = sender.replace(/\D/g, '');
      const phoneSuffix =
        cleanSender.length > 8 ? cleanSender.substring(cleanSender.length - 8) : cleanSender;

      const { rows } = await pool.query(
        `
        SELECT rl.room_id, r.room_number, t.name, t.phone_number
        FROM tenants t
        JOIN room_leases rl ON rl.tenant_id = t.id
        JOIN rooms r ON rl.room_id = r.id
        WHERE rl.status = 'ACTIVE' 
          AND REGEXP_REPLACE(t.phone_number, '\\D', '', 'g') LIKE '%' || $1
        ORDER BY rl.created_at DESC
        LIMIT 1
      `,
        [phoneSuffix]
      );

      if (rows.length > 0) {
        const { room_id, room_number, name } = rows[0];
        await pool.query(
          `INSERT INTO tickets (room_id, tenant_name, description) VALUES ($1, $2, $3)`,
          [room_id, name, laporan]
        );
        msg.reply(
          `✔️ Laporan kerusakan/keluhan untuk Kamar ${room_number} telah masuk ke sistem Dasbor Admin. Teknisi/Admin akan segera mengecek.`
        );
      } else {
        msg.reply(
          '❌ Maaf, nomor Anda tidak terdeteksi sebagai penyewa aktif di BeresKos. Laporan gagal dikirim.'
        );
      }
    } catch (err) {
      console.error('[WA] Error memproses laporan:', err);
    }
  }
});

client.on('disconnected', (reason) => {
  console.log('[WA] Client terputus:', reason);
  isReady = false;
});

client.initialize();

const sendWA = async (phone, message) => {
  if (!isReady) {
    console.log(`[WA] GAGAL kirim ke ${phone}, Bot belum ready/di-scan.`);
    return false;
  }
  try {
    // Ubah nomor ke format internasional otomatis (08 -> 628)
    let formatted = phone.replace(/^0/, '62').replace(/\D/g, '');
    const chatId = `${formatted}@c.us`;

    await client.sendMessage(chatId, message);
    console.log(`[WA] ✔️ Pesan sukses terkirim ke ${phone}`);
    return true;
  } catch (err) {
    console.error(`[WA] ❌ Error kirim ke ${phone}:`, err.message);
    return false;
  }
};

const sendWAWithQRIS = async (phone, message) => {
  if (!isReady) return false;
  try {
    let formatted = phone.replace(/^0/, '62').replace(/\D/g, '');
    const chatId = `${formatted}@c.us`;

    // Karena API WhatsApp Web internal sedang mengalami bug dengan attachment media (Error id property),
    // kita sisipkan link QRIS langsung ke dalam teks agar WhatsApp memunculkan thumbnail preview secara otomatis.
    const qrisLink =
      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=DUMMY_QRIS_PAYMENT_BERESKOS';
    const finalMessage = `${message}\n\n*Link QRIS Pembayaran:*\n${qrisLink}`;

    await client.sendMessage(chatId, finalMessage);

    console.log(`[WA] ✔️ Pesan + Link QRIS sukses terkirim ke ${phone}`);
    return true;
  } catch (err) {
    console.error(`[WA] ❌ Error kirim QRIS ke ${phone}:`, err.message);
    return false;
  }
};

module.exports = { sendWA, sendWAWithQRIS };
