// api/save-order.js
export default async function handler(req, res) {
    // Hanya izinkan method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const sheetUrl = process.env.GOOGLE_SHEET_URL; // Link rahasia diambil dari server
        
        if (!sheetUrl) {
            throw new Error("Konfigurasi Server Belum Lengkap (URL Sheet Missing)");
        }

        // Kirim data dari Frontend ke Google Script (Server to Server)
        const response = await fetch(sheetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // Teruskan data dari frontend
        });

        // Cek hasil dari Google
        const data = await response.json();
        
        return res.status(200).json({ success: true, googleData: data });

    } catch (error) {
        console.error("Gagal kirim ke Sheet:", error);
        return res.status(500).json({ error: 'Gagal menyimpan ke Excel' });
    }
}