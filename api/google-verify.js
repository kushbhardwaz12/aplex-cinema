export default function handler(req, res) {
  try {
    const { code } = req.query;
    const filename = code ? `google${code}.html` : "google-verification.html";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(`google-site-verification: ${filename}`);
  } catch (error) {
    return res.status(200).send("google-site-verification: google-verify.html");
  }
}
