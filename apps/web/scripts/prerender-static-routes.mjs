import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const baseFile = path.join(distDir, 'index.html');

const BASE_URL = 'https://www.epigraphreader.com';

if (!fs.existsSync(baseFile)) {
  throw new Error('[prerender] dist/index.html not found. Run build first.');
}

const baseHtml = fs.readFileSync(baseFile, 'utf8');

const staticRoutes = [
  {
    route: '/',
    title: 'epigraphreader.com | Aesthetic PDF & EPUB Reader & Personal Library',
    description:
      'Read and organize your digital library with a premium PDF & EPUB experience, split-screen reading, and smart highlights.',
    canonical: `${BASE_URL}/`,
    ogUrl: `${BASE_URL}/`,
    robots: 'index, follow',
    noscript:
      'Read and organize your PDF and EPUB library on epigraphreader.com. Enable JavaScript for the full reader experience.',
  },
  {
    route: '/discover',
    title: 'Discover Books | epigraphreader.com',
    description: 'Discover new books, explore categories, and find your next PDF or EPUB read.',
    canonical: `${BASE_URL}/discover`,
    ogUrl: `${BASE_URL}/discover`,
    robots: 'index, follow',
    noscript:
      'Discover books and browse curated categories on epigraphreader.com. Enable JavaScript for the full interactive experience.',
  },
  {
    route: '/404',
    title: 'Page Not Found | epigraphreader.com',
    description: 'The page you requested could not be found.',
    canonical: `${BASE_URL}/404`,
    ogUrl: `${BASE_URL}/404`,
    robots: 'noindex, nofollow',
    noscript:
      'The page you requested could not be found. Go back to the homepage to continue.',
  },
];

function applyRouteMeta(html, routeConfig) {
  let output = html;
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${routeConfig.title}</title>`);
  output = output.replace(
    /<meta name="description" content="[\s\S]*?"\s*\/?>/i,
    `<meta name="description" content="${routeConfig.description}" />`
  );
  output = output.replace(
    /<meta name="robots" content="[\s\S]*?"\s*\/?>/i,
    `<meta name="robots" content="${routeConfig.robots}" />`
  );
  output = output.replace(
    /<link rel="canonical" href="[\s\S]*?"\s*\/?>/i,
    `<link rel="canonical" href="${routeConfig.canonical}" />`
  );
  output = output.replace(
    /<meta property="og:url" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:url" content="${routeConfig.ogUrl}" />`
  );
  output = output.replace(
    /<meta property="og:title" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:title" content="${routeConfig.title}" />`
  );
  output = output.replace(
    /<meta property="og:description" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="og:description" content="${routeConfig.description}" />`
  );
  output = output.replace(
    /<meta property="twitter:url" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="twitter:url" content="${routeConfig.ogUrl}" />`
  );
  output = output.replace(
    /<meta property="twitter:title" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="twitter:title" content="${routeConfig.title}" />`
  );
  output = output.replace(
    /<meta property="twitter:description" content="[\s\S]*?"\s*\/?>/i,
    `<meta property="twitter:description" content="${routeConfig.description}" />`
  );

  const noscriptBlock = `<noscript><main style="max-width:720px;margin:40px auto;padding:0 16px;font-family:Inter,Arial,sans-serif;line-height:1.5;"><h1>${routeConfig.title}</h1><p>${routeConfig.noscript}</p></main></noscript>`;
  output = output.replace('<div id="root"></div>', `${noscriptBlock}\n  <div id="root"></div>`);

  return output;
}

for (const routeConfig of staticRoutes) {
  const targetPath =
    routeConfig.route === '/'
      ? path.join(distDir, 'index.html')
      : path.join(distDir, routeConfig.route.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, applyRouteMeta(baseHtml, routeConfig), 'utf8');
}

// Extra static hosting compatibility.
const notFoundSource = path.join(distDir, '404', 'index.html');
const notFoundTarget = path.join(distDir, '404.html');
if (fs.existsSync(notFoundSource)) {
  fs.copyFileSync(notFoundSource, notFoundTarget);
}

console.log(`[prerender] Generated static route HTML: ${staticRoutes.map((r) => r.route).join(', ')}`);
