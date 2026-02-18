import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const localFeedFile = path.join(projectRoot, 'public', 'public-books.json');

const SUPABASE_URL = process.env.SEO_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SEO_SUPABASE_SERVICE_ROLE_KEY;
const SHOULD_PRUNE = process.argv.includes('--prune');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    '[sync-public-books] Missing env vars: SEO_SUPABASE_URL and SEO_SUPABASE_SERVICE_ROLE_KEY'
  );
}

function readLocalIds() {
  if (!fs.existsSync(localFeedFile)) {
    console.warn('[sync-public-books] public-books.json not found. Nothing to sync.');
    return [];
  }

  const raw = fs.readFileSync(localFeedFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  const ids = parsed
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.id || '').trim();
      return '';
    })
    .filter((id) => UUID_RE.test(id));

  return Array.from(new Set(ids));
}

function authHeaders(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function fetchBooksByIds(ids) {
  const endpoint = new URL(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/books`);
  endpoint.searchParams.set('select', 'id,title,author,cover_url,created_at');
  endpoint.searchParams.set('id', `in.(${ids.join(',')})`);

  const res = await fetch(endpoint, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`[sync-public-books] Books fetch failed: ${res.status}`);
  }
  return res.json();
}

async function upsertCatalogRows(rows) {
  if (rows.length === 0) return [];
  const endpoint = new URL(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/public_books`);
  endpoint.searchParams.set('on_conflict', 'book_id');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    }),
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    throw new Error(`[sync-public-books] public_books upsert failed: ${res.status}`);
  }

  return res.json();
}

async function pruneMissing(ids) {
  const endpoint = new URL(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/public_books`);
  endpoint.searchParams.set('is_published', 'eq.true');
  if (ids.length > 0) {
    endpoint.searchParams.set('book_id', `not.in.(${ids.join(',')})`);
  }

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({ is_published: false }),
  });

  if (!res.ok) {
    throw new Error(`[sync-public-books] prune failed: ${res.status}`);
  }
  return res.json();
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

const ids = readLocalIds();
console.log(`[sync-public-books] local feed IDs: ${ids.length}`);

const idChunks = chunk(ids, 100);
const allBooks = [];
for (const idChunk of idChunks) {
  const books = await fetchBooksByIds(idChunk);
  allBooks.push(...books);
}

const rowById = new Map(allBooks.map((book) => [book.id, book]));
const missingIds = ids.filter((id) => !rowById.has(id));
if (missingIds.length > 0) {
  console.warn(`[sync-public-books] IDs not found in books table: ${missingIds.length}`);
}

const rows = ids
  .filter((id) => rowById.has(id))
  .map((id) => {
    const book = rowById.get(id);
    return {
      book_id: id,
      title: String(book.title || '').trim() || 'Untitled',
      author: String(book.author || '').trim() || null,
      cover_url: String(book.cover_url || '').trim() || null,
      is_published: true,
    };
  });

const upserted = await upsertCatalogRows(rows);
console.log(`[sync-public-books] upserted rows: ${upserted.length}`);

if (SHOULD_PRUNE) {
  const pruned = await pruneMissing(ids);
  console.log(`[sync-public-books] unpublished rows: ${pruned.length}`);
}

console.log('[sync-public-books] done');

