import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore/lite";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const firebaseConfig = require("../firebase-applet-config.json");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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

const escapeHtml = (text) => {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default async function handler(req, res) {
  try {
    let id = req.query?.id;
    let slug = req.query?.slug;

    if (!id && req.url) {
      const match = req.url.match(/\/movie\/([^\/\?]+)(?:\/([^\/\?]+))?/);
      if (match) {
        id = match[1];
        slug = match[2];
      }
    }

    // Locate index.html
    let htmlPath = path.join(process.cwd(), "dist", "index.html");
    if (!fs.existsSync(htmlPath)) {
      htmlPath = path.join(process.cwd(), "index.html");
    }
    let html = fs.readFileSync(htmlPath, "utf-8");

    if (!id) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    const snap = await getDoc(doc(db, "movies", id));
    if (!snap.exists()) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    const movie = { id: snap.id, ...snap.data() };
    const movieSlug = slug || generateCleanSlug(movie.title);
    const pageTitle = `${movie.title} - Download Latest HD | Sigma-flix 4US`;
    const cleanDesc = movie.description
      ? movie.description.replace(/\s+/g, " ").trim().substring(0, 160)
      : `Download and stream ${movie.title} in HD 1080p, 720p, 480p and HEVC Dual Audio on Sigma-flix 4US.`;
    const canonicalUrl = `https://aplex-cinema-4us.vercel.app/movie/${movie.id}/${movieSlug}`;
    const poster = movie.image || "https://aplex-cinema-4us.vercel.app/aplex_logo.png";
    const category = movie.category || "Movie";

    const jsonLdData = {
      "@context": "https://schema.org",
      "@type": movie.type === "series" ? "TVSeries" : "Movie",
      "name": movie.title,
      "image": poster,
      "description": cleanDesc,
      "genre": category,
      "url": canonicalUrl,
      "inLanguage": ["Hindi", "English"]
    };

    // 1. Replace Title
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // 2. Self-referencing Canonical URL
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}" />`);
    } else {
      html = html.replace("</head>", `  <link rel="canonical" href="${canonicalUrl}" />\n</head>`);
    }

    // 3. Robots meta (ensure index, follow)
    if (html.includes('<meta name="robots"')) {
      html = html.replace(/<meta\s+name="robots"[^>]*>/i, '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />');
    } else {
      html = html.replace("</head>", '  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />\n</head>');
    }

    // 4. Meta Description
    if (html.includes('<meta name="description"')) {
      html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(cleanDesc)}" />`);
    } else {
      html = html.replace("</head>", `  <meta name="description" content="${escapeHtml(cleanDesc)}" />\n</head>`);
    }

    // 5. OpenGraph Tags
    html = html.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    html = html.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(cleanDesc)}" />`);
    html = html.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonicalUrl}" />`);
    html = html.replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${poster}" />`);

    // 6. Twitter Tags
    html = html.replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
    html = html.replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(cleanDesc)}" />`);
    html = html.replace(/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${poster}" />`);

    // 7. Schema.org JSON-LD
    const jsonLdScript = `\n    <script id="movie-json-ld" type="application/ld+json">\n    ${JSON.stringify(jsonLdData, null, 2)}\n    </script>`;
    html = html.replace("</head>", `${jsonLdScript}\n</head>`);

    // 8. Pre-rendered HTML for Googlebot / Search Crawlers (Rich SSR snapshot)
    const preRenderContent = `
    <article class="prerender-movie-detail" style="max-width: 900px; margin: 30px auto; padding: 20px; font-family: system-ui, sans-serif; color: #f8fafc;">
      <nav style="font-size: 13px; color: #94a3b8; margin-bottom: 16px;">
        <a href="/" style="color: #ef4444; text-decoration: none;">Home</a> &raquo; 
        <span style="color: #cbd5e1;">${escapeHtml(category)}</span> &raquo; 
        <span style="color: #ffffff;">${escapeHtml(movie.title)}</span>
      </nav>
      <h1 style="font-size: 26px; font-weight: 800; color: #ffffff; margin-bottom: 10px; line-height: 1.3;">${escapeHtml(movie.title)}</h1>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; font-size: 13px;">
        <span style="background: #dc2626; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${escapeHtml(category)}</span>
        ${movie.year ? `<span style="background: #1f2937; color: #cbd5e1; padding: 2px 8px; border-radius: 4px;">Year: ${escapeHtml(movie.year)}</span>` : ""}
        <span style="background: #1f2937; color: #cbd5e1; padding: 2px 8px; border-radius: 4px;">Multi-Audio / Dual Audio</span>
      </div>
      <div style="display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px;">
        <img src="${poster}" alt="${escapeHtml(movie.title)}" style="max-width: 260px; width: 100%; height: auto; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 14px rgba(0,0,0,0.6);" />
        <div style="flex: 1; min-width: 260px;">
          <h2 style="font-size: 18px; color: #f87171; margin-bottom: 8px;">Movie Description & Overview</h2>
          <p style="color: #cbd5e1; line-height: 1.6; font-size: 15px; margin-bottom: 16px;">${escapeHtml(movie.description || cleanDesc)}</p>
          <div style="background: #111827; border: 1px solid #1f2937; padding: 14px; border-radius: 8px;">
            <p style="font-weight: 600; color: #fff; margin-bottom: 6px; font-size: 14px;">Available Quality Downloads:</p>
            <ul style="color: #94a3b8; font-size: 13px; margin: 0; padding-left: 20px;">
              <li>480p SD - Fast Download / Mobile Quality</li>
              <li>720p HD - High Definition [x264 / HEVC]</li>
              <li>1080p FHD - Full High Definition Dual Audio</li>
              <li>4K Ultra HD - Premium Cinema Experience</li>
            </ul>
          </div>
        </div>
      </div>
    </article>
    `;

    // Inject into prerender-hero so search engine crawlers see the full movie details immediately
    if (html.includes('<main class="prerender-hero">')) {
      html = html.replace(/<main class="prerender-hero">[\s\S]*?<\/main>/i, preRenderContent);
    } else {
      html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${preRenderContent}</div>`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (err) {
    console.error("Error serving movie page:", err);
    let fallbackPath = path.join(process.cwd(), "index.html");
    if (fs.existsSync(fallbackPath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(fs.readFileSync(fallbackPath, "utf-8"));
    }
    return res.status(500).send("Error loading movie page");
  }
}
