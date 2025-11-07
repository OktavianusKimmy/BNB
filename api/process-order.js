// api/process-order.js
import { google } from 'googleapis';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // Hanya izinkan method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed', message: 'Gunakan POST' });
    }

    try {
        // 1. Ambil data yang dikirim Frontend
        const data = req.body; // { orderId, name, total, ... }

        // 2. Logika Backend (Misal: Kirim ke Telegram)
        const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: `Order Baru: ${data.orderId} dari ${data.name}. Total: ${data.finalTotal}`,
            })
        });

        // 3. Beri respon sukses ke Frontend
        res.status(200).json({ success: true, message: 'Order diproses' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}