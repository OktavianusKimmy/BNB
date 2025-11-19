import { google } from 'googleapis';

export default async function handler(req, res) {
    try {
        // 1. Setup Google Sheets
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Tentukan Batas Stok Sosis
        const MAX_STOCK = 97; 

        // 3. Ambil Data Pesanan (Kolom F berisi detail item)
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!F:F', 
        });

        const rows = response.data.values;
        let soldCount = 0;

        // 4. Hitung berapa sosis yang sudah laku
        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const itemString = row[0]; // Contoh: "- Sosis Bakar (2x), - Americano (1x)"
                
                if (itemString && itemString.includes("Sosis Bakar")) {
                    // Gunakan Regex untuk mengambil angka di dalam kurung sebelah Sosis Bakar
                    // Mencari pola: "Sosis Bakar (Ax)" dimana A adalah angka
                    const match = itemString.match(/Sosis Bakar \((\d+)x\)/);
                    if (match) {
                        soldCount += parseInt(match[1]);
                    }
                }
            });
        }

        // 5. Hitung Sisa
        let remaining = MAX_STOCK - soldCount;
        if (remaining < 0) remaining = 0;

        // 6. Kirim ke Frontend
        res.status(200).json({ 
            itemName: "Sosis Bakar", 
            remaining: remaining,
            isSoldOut: remaining <= 0 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal cek stok' });
    }
}