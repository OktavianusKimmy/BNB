// api/process-order.js
import { google } from 'googleapis';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // CORS Handling (Opsional, agar aman jika diakses dari domain berbeda nanti)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { orderId, name, classInfo, phone, total, uniqueCode, finalTotal, items } = req.body;

        // --- 1. KIRIM KE TELEGRAM ---
        const telegramMsg = `🔔 *ORDER BARU MASUK!*\n\n` +
                            `🆔 ID: \`${orderId}\`\n` +
                            `👤 Nama: ${name} (${classInfo})\n` +
                            `📱 WA: \`${phone}\`\n\n` +
                            `🛒 *Detail:*\n${items}\n\n` +
                            `💰 Total Asli: Rp ${total.toLocaleString('id-ID')}\n` +
                            `🔑 Kode Unik: Rp ${uniqueCode}\n` +
                            `✅ *DITRANSFER: Rp ${finalTotal.toLocaleString('id-ID')}*\n\n` +
                            `_Mohon cek mutasi rekening._`;

        // Kirim tanpa menunggu (biar cepat)
        fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: telegramMsg,
                parse_mode: 'Markdown'
            })
        }).catch(err => console.error("Telegram Error:", err));

        // --- 2. CATAT KE GOOGLE SHEETS ---
        try {
            const auth = new google.auth.GoogleAuth({
                credentials: {
                    client_email: process.env.GOOGLE_CLIENT_EMAIL,
                    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                },
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            const sheets = google.sheets({ version: 'v4', auth });

            await sheets.spreadsheets.values.append({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Sheet1!A:H', // Pastikan Sheet1 ada
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), // Waktu Order
                        orderId,
                        name,
                        classInfo,
                        phone,
                        items,
                        finalTotal,
                        'Perlu Verifikasi' // Status Awal
                    ]]
                }
            });
        } catch (sheetErr) {
            console.error("Google Sheets Error:", sheetErr);
            // Kita lanjut saja meski sheets gagal, yang penting notif telegram masuk
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error.message });
    }
}