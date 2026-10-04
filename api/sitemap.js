import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore/lite";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const firebaseConfig = require("../firebase-applet-config.json");

const generateCleanSlug = (title) => {
  if (!title) return "movie";
  return title
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const escapeXml = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

export default async function handler(req, res) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const moviesCol = collection(db, "movies");
    const movieSnapshot = await getDocs(query(moviesCol));

    const baseUrl = "https://aplex-cinema-4us.vercel.app";
    const today = new Date().toISOString().split("T")[0];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Home page URL
    xml += "  <url>\n";
    xml += "    <loc>" + baseUrl + "/</loc>\n";
    xml += "    <lastmod>" + today + "</lastmod>\n";
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "    <priority>1.0</priority>\n";
    xml += "  </url>\n";

    // 2. All Movie & Series Pages (Unlimited, Live Firestore)
    movieSnapshot.forEach((doc) => {
      const movie = doc.data();
      if (movie && movie.title) {
        const slug = generateCleanSlug(movie.title);
        const url = `${baseUrl}/movie/${doc.id}/${slug}`;
        let lastmod = today;
        if (movie.createdAt) {
          try {
            lastmod = new Date(
              movie.createdAt.toMillis ? movie.createdAt.toMillis() : movie.createdAt
            )
              .toISOString()
              .split("T")[0];
          } catch {
            lastmod = today;
          }
        }

        xml += "  <url>\n";
        xml += "    <loc>" + escapeXml(url) + "</loc>\n";
        xml += "    <lastmod>" + lastmod + "</lastmod>\n";
        xml += "    <changefreq>weekly</changefreq>\n";
        xml += "    <priority>0.8</priority>\n";
        xml += "  </url>\n";
      }
    });

    xml += "</urlset>";

    // Prevent any Vercel CDN or browser caching so new movies appear in real-time
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);

    // Fallback if Firestore transient error occurs
    const backupPath = path.join(process.cwd(), "sitemap-backup.xml");
    if (fs.existsSync(backupPath)) {
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(fs.readFileSync(backupPath, "utf-8"));
    }

    res.status(500).send("Error generating sitemap");
  }
}
