const createXenditInvoice = async (invoiceId, amount, customerName, roomNumber) => {
  const apiKey = process.env.XENDIT_SECRET_KEY;

  // Fallback jika API Key belum dipasang di .env
  if (!apiKey || apiKey === 'YOUR_XENDIT_SECRET_KEY_HERE') {
    console.log(`[XENDIT] (MOCK) Membuat Link Tagihan Dummy untuk ${customerName}`);
    return `https://checkout-staging.xendit.co/web/dummy-${invoiceId}`;
  }

  try {
    const token = Buffer.from(apiKey + ':').toString('base64');
    const res = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify({
        external_id: invoiceId.toString(),
        amount: amount,
        description: `Tagihan Sewa BeresKos - Kamar ${roomNumber}`,
        customer: { given_names: customerName },
        invoice_duration: 86400 * 3, // Berlaku 3 hari (sesuai H-3 worker)
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[XENDIT] Gagal membuat invoice:', data);
      return null;
    }

    console.log(`[XENDIT] ✔️ Invoice resmi dibuat: ${data.invoice_url}`);
    return data.invoice_url;
  } catch (err) {
    console.error('[XENDIT] Error HTTP:', err.message);
    return null;
  }
};

module.exports = { createXenditInvoice };
