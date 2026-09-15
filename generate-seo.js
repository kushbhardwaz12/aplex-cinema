import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  projectId: "auspicious-woods-707pf",
  apiKey: "AIzaSyBckimcPHBO2mW3wg0cmppa8gs0-8lavi8",
  authDomain: "auspicious-woods-707pf.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-1bf586e0-99a1-4e17-a44d-7305d9d2d2a4");

function generateCleanSlug(title) {
  if (!title) return "movie";
  return title.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  try {
    const snapshot = await getDocs(collection(db, "movies"));
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    let htmlLinks = '<div id="seo-links" style="display:none;">\n';
    
    // Add home page
    sitemap += `  <url>
    <loc>https://aplexcinema4us.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

    snapshot.forEach(doc => {
      const movie = { id: doc.id, ...doc.data() };
      const slug = generateCleanSlug(movie.title);
      const url = `https://aplexcinema4us.com/movie/${movie.id}/${slug}`;
      
      sitemap += `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      htmlLinks += `  <a href="/movie/${movie.id}/${slug}">${movie.title}</a>\n`;
    });
    
    sitemap += '</urlset>';
    htmlLinks += '</div>';

    fs.writeFileSync('public/sitemap.xml', sitemap);
    
    // Inject htmlLinks into index.html
    let indexHtml = fs.readFileSync('index.html', 'utf8');
    // Remove old if exists
    indexHtml = indexHtml.replace(/<div id="seo-links".*?<\/div>/s, '');
    // Insert before closing body
    indexHtml = indexHtml.replace('</body>', htmlLinks + '\n</body>');
    fs.writeFileSync('index.html', indexHtml);
    
    console.log('Successfully generated SEO data for ' + snapshot.size + ' movies.');
    process.exit(0);
  } catch (err) {
    console.error('Error fetching data:', err);
    process.exit(1);
  }
}

run();
