import fs from 'fs';

async function run() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Sitemap containing ONLY the homepage
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    sitemap += `  <url>
    <loc>https://aplex-cinema-4us.vercel.app/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;
    sitemap += '</urlset>\n';

    fs.writeFileSync('sitemap-backup.xml', sitemap);
    fs.writeFileSync('public/sitemap.xml', sitemap);
    
    // Clean index.html: remove old movie link directory or seo-links if present
    if (fs.existsSync('index.html')) {
      let indexHtml = fs.readFileSync('index.html', 'utf8');
      indexHtml = indexHtml.replace(/<div id="seo-links".*?<\/div>/s, '');
      indexHtml = indexHtml.replace(/<footer id="site-movie-directory".*?<\/footer>/s, '');
      // Clean up extra whitespace/empty lines at the bottom before </body>
      indexHtml = indexHtml.replace(/\n\s*\n\s*<\/body>/, '\n  </body>');
      fs.writeFileSync('index.html', indexHtml);
    }
    
    console.log('Successfully configured sitemap with homepage only (all movie links removed).');
    process.exit(0);
  } catch (err) {
    console.error('Error updating SEO/sitemap:', err);
    process.exit(1);
  }
}

run();
