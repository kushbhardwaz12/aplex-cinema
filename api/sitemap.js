import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore/lite";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const firebaseConfig = require("../firebase-applet-config.json");

// Add helper function to generate clean slug matching generate-seo.js and App.tsx
const generateCleanSlug = (title) => {
  if (!title) return "movie";
  return title.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export default async function handler(req, res) {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const moviesCol = collection(db, "movies");
    const movieSnapshot = await getDocs(query(moviesCol));
    
    const baseUrl = 'https://aplex-cinema-4us.vercel.app';
    const today = new Date().toISOString().split('T')[0];
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add home page
    xml += '  <url>\n';
    xml += '    <loc>' + baseUrl + '/</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    movieSnapshot.forEach((doc) => {
      const movie = doc.data();
      if (movie && movie.title) {
        const slug = generateCleanSlug(movie.title);
        const url = baseUrl + '/movie/' + doc.id + '/' + slug;
        let lastmod = today;
        if (movie.createdAt) {
          try {
            lastmod = new Date(movie.createdAt.toMillis ? movie.createdAt.toMillis() : movie.createdAt).toISOString().split('T')[0];
          } catch {
            lastmod = today;
          }
        }
        
        xml += '  <url>\n';
        xml += '    <loc>' + url + '</loc>\n';
        xml += '    <lastmod>' + lastmod + '</lastmod>\n';
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>';

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache for 1 day
    res.status(200).send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
}
