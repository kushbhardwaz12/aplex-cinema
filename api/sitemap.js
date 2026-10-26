import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
let firebaseConfig;
try {
  firebaseConfig = require("../firebase-applet-config.json");
} catch (e) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  } catch (err) {
    console.error("Could not load firebase config in sitemap.js:", err);
  }
}

let db = null;
if (firebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (e) {
    console.error("Error initializing Firebase in sitemap.js:", e);
  }
}

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

const escapeXml = (unsafe) => {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "\'": return "&apos;";
      case "\"": return "&quot;";
    }
  });
};

export default async function handler(req, res) {
  const baseUrl = "https://aplex-cinema-4us.vercel.app";
  const today = new Date().toISOString().split("T")[0];

  try {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Home page URL
    xml += "  <url>\n";
    xml += "    <loc>" + baseUrl + "/</loc>\n";
    xml += "    <lastmod>" + today + "</lastmod>\n";
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "    <priority>1.0</priority>\n";
    xml += "  </url>\n";

    if (db) {
      const snap = await getDocs(collection(db, "movies"));
      snap.docs.forEach((d) => {
        const data = d.data();
        const id = d.id;
        const title = data.title || "Movie";
        const slug = generateCleanSlug(title);
        const url = `${baseUrl}/movie/${id}/${slug}`;
        let movieDate = today;
        if (data.createdAt?.toDate) {
          movieDate = data.createdAt.toDate().toISOString().split("T")[0];
        } else if (data.updatedAt?.toDate) {
          movieDate = data.updatedAt.toDate().toISOString().split("T")[0];
        }

        xml += "  <url>\n";
        xml += "    <loc>" + escapeXml(url) + "</loc>\n";
        xml += "    <lastmod>" + movieDate + "</lastmod>\n";
        xml += "    <changefreq>weekly</changefreq>\n";
        xml += "    <priority>0.8</priority>\n";
        xml += "  </url>\n";
      });
    }

    xml += "</urlset>";

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    // Cache on CDN for 1 hour, stale-while-revalidate for 24h
    res.setHeader(
      "Cache-Control",
      "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
    );
    return res.status(200).send(xml);
  } catch (error) {
    console.error("Error serving dynamic sitemap:", error);

    const candidates = [
      path.join(process.cwd(), "public", "sitemap.xml"),
      path.join(process.cwd(), "sitemap-backup.xml"),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        return res.status(200).send(fs.readFileSync(p, "utf-8"));
      }
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>\n</urlset>`
    );
  }
}
