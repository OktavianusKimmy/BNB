export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const sheetUrl = process.env.GOOGLE_SHEET_URL;
        
        // Kirim ke Google Script
        const response = await fetch(sheetUrl, {
            method: 'POST',
            // Google Script butuh redirect 'follow' kadang-kadang
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // req.body harusnya sudah object
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}