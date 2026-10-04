const createXenditInvoice = async (invoiceId, amount, customerName, roomNumber) => {
    const apiKey = process.env.XENDIT_SECRET_KEY;
    const subAccountId = process.env.XENDIT_SUB_ACCOUNT_ID; // Akun Penjaga Kos / Kas Dapur
    
    // Fallback jika API Key belum dipasang di .env
    if (!apiKey || apiKey === 'YOUR_XENDIT_SECRET_KEY_HERE') {
        console.log(`[XENDIT] (MOCK) Membuat Link Tagihan Dummy untuk ${customerName}`);
        return `https://checkout-staging.xendit.co/web/dummy-${invoiceId}`;
    }

    try {
        const token = Buffer.from(apiKey + ':').toString('base64');
        
        // Payload Dasar Invoice
        const payload = {
            external_id: invoiceId.toString(),
            amount: amount,
            description: `Tagihan Sewa BeresKos - Kamar ${roomNumber}`,
            customer: { given_names: customerName },
            invoice_duration: 86400 * 3 // Berlaku 3 hari
        };

        // Jika fitur xenPlatform / Split Rule diaktifkan via .env
        // Kita instruksikan Xendit memotong fix Rp 20.000 ke sub-akun (Kas Dapur) secara otomatis di udara.
        if (subAccountId) {
            payload.fees = [
                {
                    type: 'KAS_DAPUR',
                    value: 20000
                }
            ];
            payload.items = [
                {
                    name: 'Sewa Kamar',
                    price: amount - 20000,
                    quantity: 1
                },
                {
                    name: 'Iuran Kas Dapur (Galon & Gas)',
                    price: 20000,
                    quantity: 1
                }
            ];
            // Header khusus xendit untuk memecah dana (Route)
            // https://developers.xendit.co/api-reference/#create-invoice-with-split-rule
            payload.for_user_id = subAccountId; // Atau menggunakan xenPlatform headers (tergantung versi API)
            console.log('[XENDIT] Split Payment / Route Rule diaktifkan untuk Kas Dapur.');
        }

        const res = await fetch('https://api.xendit.co/v2/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${token}`,
                // Jika ingin uang utama masuk ke Anda, dan Rp 20rb dilempar via API-Level Route:
                ...(subAccountId && { 'with-fee-rule': 'true' }) 
            },
            body: JSON.stringify(payload)
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
