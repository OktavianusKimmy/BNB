export default function handler(req, res) {
  const { passwordInput } = req.body;
  const passwordAsli = process.env.ADMIN_PASSWORD; // Password dari Vercel Environment Variables

  if (passwordInput === passwordAsli) {
    return res.status(200).json({ allowed: true });
  } else {
    return res.status(401).json({ allowed: false });
  }
}