// api/check-admin.js
export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // Ambil password yang dikirim dari frontend
    const { password } = req.body;

    // Bandingkan dengan password rahasia di Environment Variables
    if (password === process.env.ADMIN_PASSWORD) {
        // Jika cocok
        res.status(200).json({ success: true });
    } else {
        // Jika salah
        res.status(401).json({ success: false });
    }
}