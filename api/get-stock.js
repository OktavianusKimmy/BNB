import { google } from 'googleapis';

export default async function handler(req, res) {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // --- UBAH ANGKA DI SINI ---
        const MAX_STOCK = 103; // Target penjualan baru (99 terjual + 4 slot sisa)
        // --------------------------

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!F:F', 
        });

        const rows = response.data.values;
        let soldCount = 0;

        if (rows && rows.length > 0) {
            rows.forEach(row => {
                const itemString = row[0]; 
                if (itemString && itemString.includes("Sosis Bakar")) {
                    const match = itemString.match(/Sosis Bakar \((\d+)x\)/);
                    if (match) {
                        soldCount += parseInt(match[1]);
                    }
                }
            });
        }

        let remaining = MAX_STOCK - soldCount;
        if (remaining < 0) remaining = 0;

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