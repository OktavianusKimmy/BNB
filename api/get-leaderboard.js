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
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], 
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Baca semua data dari Sheet1
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A2:G', 
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(200).json([]);
        }

        // --- TAMBAHAN BARU: KAMUS PEMETAAN KELAS KE KATEGORI ---
        const categoryMap = {
            "PPBP 7": "Zeus",
            "PPTI 21": "Zeus",
            "PPTI 24": "Zeus",
            
            "PPBP 8": "Athena",
            "PPBP 10": "Athena",
            "PPTI 20": "Athena",
            "PPTI 23": "Athena",
            
            "PPBP 9": "Poseidon",
            "PPTI 22": "Poseidon",
            "PPTI 25": "Poseidon",
            
            "DPP": "DPP"
        };

        // 3. Hitung Total per Kategori (Bukan lagi per Kelas)
        const categoryTotals = {};
        
        rows.forEach(row => {
            if (row.length > 6) {
                const rawClass = row[3] ? row[3].trim() : ''; 
                
                // Cari nama kategori dari kamus. Jika kelas tidak terdaftar, masukkan ke 'Lainnya'
                const categoryName = categoryMap[rawClass] || 'Lainnya'; 

                // Bersihkan format Rp atau titik/koma jika ada, ambil angkanya saja
                const totalStr = row[6] ? row[6].replace(/[^\d]/g, '') : '0';
                const total = parseInt(totalStr) || 0;

                // Jumlahkan berdasarkan Kategori
                if (categoryTotals[categoryName]) {
                    categoryTotals[categoryName] += total;
                } else {
                    categoryTotals[categoryName] = total;
                }
            }
        });

        // 4. Ubah ke Array dan Sortir (Terbesar ke Terkecil)
        const leaderboard = Object.keys(categoryTotals).map(key => ({
            kategori: key,      // <-- Perhatikan ini sekarang bernama 'kategori'
            total: categoryTotals[key]
        })).sort((a, b) => b.total - a.total); 

        // 5. Kirim hasil
        res.status(200).json(leaderboard);

    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ error: 'Gagal mengambil data leaderboard' });
    }
}