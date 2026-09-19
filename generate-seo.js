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
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Clean, legitimate crawlable footer directory (NOT display:none to avoid Google spam penalty)
    let htmlLinks = '<footer id="site-movie-directory" class="seo-movie-directory" aria-label="Movies and Series Directory">\n';
    htmlLinks += '  <div class="directory-container">\n';
    htmlLinks += '    <h3 class="directory-heading">Latest Movies & Series Directory</h3>\n';
    htmlLinks += '    <div class="directory-links">\n';
    
    // Add home page
    sitemap += `  <url>
    <loc>https://aplex-cinema-4us.vercel.app/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;

    snapshot.forEach(doc => {
      const movie = { id: doc.id, ...doc.data() };
      const slug = generateCleanSlug(movie.title);
      const url = `https://aplex-cinema-4us.vercel.app/movie/${movie.id}/${slug}`;
      
      let lastmod = today;
      if (movie.createdAt) {
        try {
          lastmod = new Date(movie.createdAt.toMillis ? movie.createdAt.toMillis() : movie.createdAt).toISOString().split('T')[0];
        } catch {
          lastmod = today;
        }
      }
      
      sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
      htmlLinks += `      <a href="/movie/${movie.id}/${slug}">${movie.title}</a>\n`;
    });
    
    sitemap += '</urlset>';
    htmlLinks += '    </div>\n  </div>\n</footer>';

    fs.writeFileSync('public/sitemap.xml', sitemap);
    
    // Inject htmlLinks into index.html
    let indexHtml = fs.readFileSync('index.html', 'utf8');
    // Remove old hidden seo-links or old site-movie-directory if exists
    indexHtml = indexHtml.replace(/<div id="seo-links".*?<\/div>/s, '');
    indexHtml = indexHtml.replace(/<footer id="site-movie-directory".*?<\/footer>/s, '');
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
