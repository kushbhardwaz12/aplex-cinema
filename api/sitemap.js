import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const baseUrl = "https://aplex-cinema-4us.vercel.app";
    const today = new Date().toISOString().split("T")[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Home page URL ONLY (All movie URLs removed from sitemap as requested)
    xml += "  <url>\n";
    xml += "    <loc>" + baseUrl + "/</loc>\n";
    xml += "    <lastmod>" + today + "</lastmod>\n";
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "    <priority>1.0</priority>\n";
    xml += "  </url>\n";

    xml += "</urlset>";

    // Prevent any Vercel CDN or browser caching
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error serving sitemap:", error);

    const backupPath = path.join(process.cwd(), "sitemap-backup.xml");
    if (fs.existsSync(backupPath)) {
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(fs.readFileSync(backupPath, "utf-8"));
    }

    res.status(500).send("Error generating sitemap");
  }
}
