import { google } from 'googleapis';

export default async function handler(req, res) {
    // Hanya izinkan method GET
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // 1. Autentikasi Google Sheets
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Readonly cukup
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Baca semua data dari Sheet1
        // Asumsi: Kolom D = Kelas (index 3), Kolom G = Total Transfer (index 6)
        // Sesuaikan range jika kolom Anda berbeda.
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A2:G', // Mulai A2 agar header tidak terhitung
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(200).json([]);
        }

        // 3. Hitung Total per Kelas
        const classTotals = {};
        rows.forEach(row => {
            // Pastikan row memiliki data yang cukup
            if (row.length > 6) {
                const className = row[3] ? row[3].trim() : 'Lainnya'; // Kolom D (Kelas)
                // Bersihkan format Rp atau titik/koma jika ada, ambil angkanya saja
                const totalStr = row[6] ? row[6].replace(/[^\d]/g, '') : '0';
                const total = parseInt(totalStr) || 0;

                if (classTotals[className]) {
                    classTotals[className] += total;
                } else {
                    classTotals[className] = total;
                }
            }
        });

        // 4. Ubah ke Array dan Sortir (Terbesar ke Terkecil)
        const leaderboard = Object.keys(classTotals).map(key => ({
            kelas: key,
            total: classTotals[key]
        })).sort((a, b) => b.total - a.total); // Sort descending

        // 5. Kirim hasil
        res.status(200).json(leaderboard);

    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ error: 'Gagal mengambil data leaderboard' });
    }
}