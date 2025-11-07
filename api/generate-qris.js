// api/generate-qris.js

// --- 1. FUNGSI LOGIKA (Dipindah dari Frontend) ---
function crc16ccitt(text) {
    let crc = 0xFFFF;
    for (let i = 0; i < text.length; i++) {
        let c = text.charCodeAt(i);
        crc ^= c << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// --- 2. HANDLER UTAMA VERCEL ---
export default async function handler(req, res) {
    // Hanya izinkan POST agar tidak bisa ditembak sembarangan via browser url
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { amount } = req.body;
        // Ambil string asli dari "Brankas" Vercel
        const originalString = process.env.MAIN_QRIS_STRING;

        if (!originalString || !amount) {
             throw new Error("Data tidak lengkap");
        }

        // Logika Bedah QRIS (sama seperti sebelumnya, tapi sekarang di server)
        let crcIndex = originalString.lastIndexOf("6304");
        if (crcIndex === -1) crcIndex = originalString.length - 8;

        let cleanString = originalString.substring(0, crcIndex);
        let amountStr = amount.toString();
        let tag54 = "54" + amountStr.length.toString().padStart(2, '0') + amountStr;
        let incompleteString = cleanString + tag54 + "6304";
        
        // Hasil akhir
        let dynamicQR = incompleteString + crc16ccitt(incompleteString);

        // Kirim balik ke frontend
        res.status(200).json({ qr_string: dynamicQR });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}