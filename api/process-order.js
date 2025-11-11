// api/process-order.js
// Menggunakan 'require' (gaya CommonJS) yang lebih stabil di Vercel
const { google } = require('googleapis');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // CORS Handling agar tidak diblokir browser
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tangani request pre-flight dari browser
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Hanya izinkan POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { orderId, name, classInfo, phone, total, uniqueCode, finalTotal, items } = req.body;

        // --- 1. KIRIM NOTIFIKASI KE TELEGRAM ---
        const telegramMsg = `🔔 *ORDER BARU MASUK!*\n\n` +
                            `🆔 ID: \`${orderId}\`\n` +
                            `👤 Nama: ${name} (${classInfo})\n` +
                            `📱 WA: \`${phone}\`\n\n` +
                            `🛒 *Detail:*\n${items}\n\n` +
                            `💰 Total Asli: Rp ${total.toLocaleString('id-ID')}\n` +
                            `🔑 Kode Unik: Rp ${uniqueCode}\n` +
                            `✅ *DITRANSFER: Rp ${finalTotal.toLocaleString('id-ID')}*\n\n` +
                            `_Mohon cek mutasi rekening._`;

        // Kita gunakan 'await' di sini agar yakin terkirim sebelum fungsi selesai
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: telegramMsg,
                parse_mode: 'Markdown'
            })
        });

        // --- 2. CATAT KE GOOGLE SHEETS ---
        try {
            // Kredensial dari Environment Variables Vercel
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const sheets = google.sheets({ version: 'v4', auth });

            // Menyiapkan tanggal hari ini
            const today = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

            // Menulis baris baru ke Sheet
            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Sheet1!A:I', // Pastikan nama sheet Anda benar "Sheet1"
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        today, orderId, name, classInfo, phone, items, finalTotal, 'Perlu Verifikasi', false
                    ]]
                }
            });

        } catch (sheetError) {
            console.error("Google Sheets Error: Hubungi CP dan berikan screenshot ini beserta bukti transfer!", sheetError.message);
            // Optional: Jika sheets gagal, kita tetap anggap sukses agar user tidak panik,
            // karena notif Telegram sudah masuk.
        }

        // Beri respon sukses ke Frontend
        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Fatal Backend Error:', error);
        res.status(500).json({ error: error.message });
    }
};