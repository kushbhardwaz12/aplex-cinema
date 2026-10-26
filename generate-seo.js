import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore/lite';

const generateCleanSlug = (title) => {
  if (!title) return 'movie';
  return title
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const escapeXml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
};

async function run() {
  try {
    const baseUrl = 'https://aplex-cinema-4us.vercel.app';
    const today = new Date().toISOString().split('T')[0];

    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    console.log('Fetching movies for sitemap and SEO index generation...');
    const snapshot = await getDocs(collection(db, 'movies'));
    console.log(`Fetched ${snapshot.size} movies from Firestore.`);

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // 1. Homepage
    sitemap += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    const movieList = [];

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const id = d.id;
      const title = data.title || 'Movie';
      const slug = generateCleanSlug(title);
      const url = `${baseUrl}/movie/${id}/${slug}`;
      let movieDate = today;
      if (data.createdAt?.toDate) {
        movieDate = data.createdAt.toDate().toISOString().split('T')[0];
      } else if (data.updatedAt?.toDate) {
        movieDate = data.updatedAt.toDate().toISOString().split('T')[0];
      }

      movieList.push({ id, title, slug, url, date: movieDate, category: data.category || 'Movie' });

      sitemap += `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${movieDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    sitemap += '</urlset>\n';

    // Write static sitemap for Vercel and local static builds
    fs.writeFileSync('public/sitemap.xml', sitemap);
    fs.writeFileSync('sitemap-backup.xml', sitemap);
    console.log(`Successfully generated public/sitemap.xml with ${snapshot.size + 1} URLs.`);

    // Inject SEO crawlable movie links into index.html for Googlebot crawler discovery
    if (fs.existsSync('index.html')) {
      let indexHtml = fs.readFileSync('index.html', 'utf8');

      // Update google-site-verification if present in Firestore
      try {
        const seoSnap = await getDoc(doc(db, 'site_settings', 'seo'));
        if (seoSnap.exists() && seoSnap.data()?.verificationCode) {
          const vCode = seoSnap.data().verificationCode;
          indexHtml = indexHtml.replace(
            /<meta\s+name="google-site-verification"[^>]*>/i,
            `<meta name="google-site-verification" content="${escapeXml(vCode)}" />`
          );
        }
      } catch (err) {
        console.warn('Could not read site_settings/seo during build:', err.message);
      }

      // Build crawlable directory HTML
      let directoryHtml = `
      <section id="seo-movie-directory" class="seo-movie-directory" aria-label="Latest HD Movies and Web Series Directory">
        <div class="directory-container">
          <h2 class="directory-heading">Latest HD Movies &amp; Series Directory</h2>
          <div class="directory-links">
`;
      // Take up to 100 recent movies for the static prerender directory
      movieList.slice(0, 120).forEach((m) => {
        directoryHtml += `            <a href="/movie/${m.id}/${m.slug}" title="Download ${escapeXml(m.title)} HD">${escapeXml(m.title)}</a>\n`;
      });
      directoryHtml += `          </div>
        </div>
      </section>
`;

      // Replace or insert seo-movie-directory
      if (indexHtml.includes('<section id="seo-movie-directory"')) {
        indexHtml = indexHtml.replace(/<section id="seo-movie-directory"[\s\S]*?<\/section>/i, directoryHtml.trim());
      } else {
        indexHtml = indexHtml.replace('</main>', `</main>\n${directoryHtml}`);
      }

      fs.writeFileSync('index.html', indexHtml);
      console.log('Successfully updated index.html with crawlable movie directory for Google Search Console.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error generating SEO / sitemap:', err);
    // Exit with 0 so build doesn't fail if Firestore is unreachable
    process.exit(0);
  }
}

run();
