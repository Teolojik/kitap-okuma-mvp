import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

const BASE_URL = 'https://www.epigraphreader.com';
const today = new Date().toISOString().slice(0, 10);

const pages = [
  {
    loc: '/',
    changefreq: 'weekly',
    priority: '1.0',
    images: [
      {
        loc: `${BASE_URL}/og-card.png`,
        title: 'epigraphreader.com - Aesthetic Digital Library',
        caption: 'The most elegant way to read PDF and EPUB files.',
      },
      {
        loc: `${BASE_URL}/pwa-512x512.png`,
        title: 'epigraphreader.com Logo',
      },
    ],
  },
  {
    loc: '/discover',
    changefreq: 'daily',
    priority: '0.9',
  },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages
  .map((page) => {
    const imageTags = (page.images || [])
      .map((img) => {
        const caption = img.caption ? `\n      <image:caption>${img.caption}</image:caption>` : '';
        return `    <image:image>
      <image:loc>${img.loc}</image:loc>
      <image:title>${img.title}</image:title>${caption}
    </image:image>`;
      })
      .join('\n');

    return `  <url>
    <loc>${BASE_URL}${page.loc === '/' ? '/' : page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>${imageTags ? `\n${imageTags}` : ''}
  </url>`;
  })
  .join('\n\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Allow: /api/share
Disallow: /admin
Disallow: /login
Disallow: /read/
Disallow: /settings
Disallow: /profile
Disallow: /stats

Sitemap: ${BASE_URL}/sitemap.xml
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`[seo] Generated sitemap.xml and robots.txt (${today})`);

