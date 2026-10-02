const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[WA] Client is ready! Bot WhatsApp berhasil terhubung.');
  isReady = true;
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

    // Mengirim Dummy Gambar QR Code
    const media = await MessageMedia.fromUrl(
      'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg'
    );
    await client.sendMessage(chatId, media, { caption: message });

    console.log(`[WA] ✔️ Pesan + QRIS sukses terkirim ke ${phone}`);
    return true;
  } catch (err) {
    console.error(`[WA] ❌ Error kirim QRIS ke ${phone}:`, err.message);
    return false;
  }
};

module.exports = { sendWA, sendWAWithQRIS };
