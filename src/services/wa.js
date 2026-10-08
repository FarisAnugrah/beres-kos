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
client.on('message_create', async (msg) => {
  // message_create menangkap pesan masuk DARI orang lain DAN pesan KELUAR dari diri kita sendiri.
  const body = msg.body.trim();
  if (body.toUpperCase().startsWith('LAPOR ')) {
    const laporan = body.substring(6).trim();

    // Tarik kontak/pengirim aslinya langsung dari API Message untuk mencegah format @lid
    let contact = await msg.getContact();

    // Fallback: Jika pesan ini adalah pesan MENGIRIM DARI diri sendiri (bot nge-chat diri sendiri),
    // pastikan kita mengambil tujuan pesan tersebut (yang mana adalah nomor kita sendiri atau nomor lawan).
    let rawSender = contact.number;

    // Tarik langsung nomor asli pengirim chat tersebut tanpa peduli format Multi-Device WA
    if (msg.fromMe) {
      // Jika bot yang ngetik laporan (ngechat bot lain / ngechat diri sendiri)
      rawSender = client.info.wid.user;
    } else {
      // Jika orang lain yang ngetik laporan
      // msg.author biasanya berisi nomor WA asli yang tersambung di multi-device, sedangkan msg.from bisa saja LID/Group ID.
      // Kita pakai msg.author jika ada, lalu msg.from
      rawSender = msg.author ? msg.author : msg.from;
    }

    let sender = rawSender.replace('@c.us', '').replace('@lid', '').replace('@s.whatsapp.net', '');

    // JARING PENGAMAN (ULTIMATE FALLBACK):
    // Jika WhatsApp masih saja berkeras menyembunyikan identitas pengirim asli dan malah mengirimkan LID (awalan 860...),
    // kita akan "memaksa" membaca nomor WA tersebut dengan melihat dari objek _data mentah_ milik pesan.
    if (sender.startsWith('860') || sender.length > 15) {
      // Mencoba mendongkel nomor asli dari dalam _data mentah
      const possibleRealNumber =
        msg._data?.notifyName || msg._data?.author?.split('@')[0] || msg.from?.split('@')[0];

      // Kadang contact object yang dikembalikan getContact punya properti number yang kosong tapi id.user berisi nomor asli.
      if (contact && contact.id && contact.id.user && !contact.id.user.startsWith('860')) {
        sender = contact.id.user;
      }
    }

    console.log(
      '[DEBUG WA] Laporan masuk. rawSender:',
      rawSender,
      ' | sender:',
      sender,
      ' | contact.number:',
      contact.number
    );

    try {
      // Cari penyewa aktif berdasarkan nomor WA
      // Karena input Admin mungkin bervariasi (0812.., 6281.., +6281..), dan sender WA selalu '6281...'
      // Kita membuang angka non-digit dan mengekstrak nomor HP aslinya saja.
      const cleanSender = sender.replace(/\D/g, '');
      const phoneSuffix =
        cleanSender.length > 9 ? cleanSender.substring(cleanSender.length - 9) : cleanSender;

      console.log('[DEBUG WA] cleanSender:', cleanSender, ' | phoneSuffix:', phoneSuffix);

      const { rows } = await pool.query(
        `
        SELECT rl.room_id, r.room_number, t.name, t.phone_number
        FROM tenants t
        JOIN room_leases rl ON rl.tenant_id = t.id
        JOIN rooms r ON rl.room_id = r.id
        WHERE rl.status = 'ACTIVE' 
          AND REGEXP_REPLACE(t.phone_number, '\\D', '', 'g') LIKE '%' || $1
        ORDER BY rl.id DESC
        LIMIT 1
      `,
        [phoneSuffix]
      );

      console.log('[DEBUG WA] DB Result:', rows);

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

const sendWAWithLocalImage = async (phone, caption, localFilePath) => {
  if (!isReady) return false;
  try {
    let formatted = phone.replace(/^0/, '62').replace(/\D/g, '');
    const chatId = `${formatted}@c.us`;

    // Library whatsapp-web.js sedang mengalami bug kronis (id property undefined) saat mengirim
    // MessageMedia objek menggunakan metode bawaan.
    // Hack Bypass: Gunakan base64 murni tanpa kelas MessageMedia
    const fs = require('fs');
    const path = require('path');
    const mime = require('mime-types'); // Walaupun opsional, aman dikosongkan jika format dasar

    const fileBuffer = fs.readFileSync(localFilePath);
    const base64Data = fileBuffer.toString('base64');
    const mimeType = mime.lookup(localFilePath) || 'image/jpeg';
    const filename = path.basename(localFilePath);

    const media = new MessageMedia(mimeType, base64Data, filename);

    // Kirim menggunakan trik opsi sendMediaAsDocument jika bug masih terjadi,
    // tapi mari kita coba normal dulu dengan format Base64 murni ini
    await client.sendMessage(chatId, media, { caption: caption });

    console.log(`[WA] ✔️ Foto bukti + Pesan sukses terkirim ke ${phone}`);
    return true;
  } catch (err) {
    console.error(`[WA] ❌ Error kirim Foto Bukti ke ${phone}:`, err.message);

    // Fallback: Jika media file gagal (bug library), kirim teks saja
    console.log(`[WA] Mengirim teks fallback tanpa gambar.`);
    await client.sendMessage(
      phone.replace(/^0/, '62').replace(/\D/g, '') + '@c.us',
      caption + '\n\n*(Sistem gagal melampirkan file foto bukti)*'
    );
    return false;
  }
};

module.exports = { sendWA, sendWAWithQRIS, sendWAWithLocalImage };
