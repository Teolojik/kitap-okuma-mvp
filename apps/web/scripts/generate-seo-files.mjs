import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const localPublicBooksFile = path.join(publicDir, 'public-books.json');

const BASE_URL = 'https://www.epigraphreader.com';
const today = new Date().toISOString().slice(0, 10);
const ENABLE_PUBLIC_BOOK_SITEMAP = process.env.ENABLE_PUBLIC_BOOK_SITEMAP === 'true';
const SEO_SUPABASE_URL = process.env.SEO_SUPABASE_URL;
const SEO_SUPABASE_SERVICE_ROLE_KEY = process.env.SEO_SUPABASE_SERVICE_ROLE_KEY;

function safeDate(value) {
  if (!value) return today;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return today;
  return parsed.toISOString().slice(0, 10);
}

function readLocalPublicBooks() {
  if (!fs.existsSync(localPublicBooksFile)) return [];
  try {
    const raw = fs.readFileSync(localPublicBooksFile, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => ({
        id: String(item?.id || '').trim(),
        lastmod: safeDate(item?.lastmod || item?.updated_at || item?.created_at),
      }))
      .filter((item) => item.id.length > 0);
  } catch (err) {
    console.warn('[seo] Failed to parse public-books.json:', err?.message || err);
    return [];
  }
}

async function readSupabasePublicBooks() {
  if (!SEO_SUPABASE_URL || !SEO_SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const endpoint = `${SEO_SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/public_books?select=book_id,updated_at,created_at&is_published=eq.true`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: SEO_SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SEO_SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      console.warn(`[seo] Supabase public_books fetch failed: ${res.status}`);
      return [];
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) return [];

    return rows
      .map((row) => ({
        id: String(row?.book_id || '').trim(),
        lastmod: safeDate(row?.updated_at || row?.created_at),
      }))
      .filter((item) => item.id.length > 0);
  } catch (err) {
    console.warn('[seo] Supabase public_books fetch error:', err?.message || err);
    return [];
  }
}

function mergeBooks(...sources) {
  const map = new Map();
  for (const source of sources) {
    for (const item of source) {
      if (!item?.id) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
        continue;
      }
      if (existing.lastmod < item.lastmod) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

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

const localBooks = readLocalPublicBooks();
const remoteBooks = ENABLE_PUBLIC_BOOK_SITEMAP ? await readSupabasePublicBooks() : [];
const publicBooks = ENABLE_PUBLIC_BOOK_SITEMAP ? mergeBooks(localBooks, remoteBooks) : [];

const bookPages = publicBooks.map((book) => ({
  loc: `/book/${book.id}`,
  changefreq: 'weekly',
  priority: '0.7',
  lastmod: book.lastmod,
}));

const allPages = [...pages, ...bookPages];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allPages
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
    <lastmod>${page.lastmod || today}</lastmod>
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
if (ENABLE_PUBLIC_BOOK_SITEMAP) {
  console.log(`[seo] Book sitemap entries: ${publicBooks.length}`);
} else {
  console.log('[seo] Book sitemap entries disabled (set ENABLE_PUBLIC_BOOK_SITEMAP=true)');
}
