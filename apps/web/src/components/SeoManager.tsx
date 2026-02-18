import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useBookStore } from '@/stores/useStore';
import { cleanAuthor, cleanTitle } from '@/lib/metadata-utils';

const BASE_URL = 'https://www.epigraphreader.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-card.png`;

type SeoConfig = {
  title: string;
  description: string;
  robots?: string;
  canonicalPath?: string;
  image?: string;
  type?: 'website' | 'article' | 'book';
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function normalizePath(pathname: string) {
  const clean = pathname.replace(/\/+$/, '');
  return clean || '/';
}

function trimText(value: string, max = 160) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function resolveImage(url?: string) {
  if (!url) return DEFAULT_IMAGE;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return DEFAULT_IMAGE;
}

export default function SeoManager() {
  const location = useLocation();
  const { books } = useBookStore();

  useEffect(() => {
    const path = normalizePath(location.pathname);
    const defaultConfig: SeoConfig = {
      title: 'epigraphreader.com | Aesthetic PDF & EPUB Reader & Personal Library',
      description:
        'Read and organize your digital library with a premium PDF & EPUB experience, split-screen reading, and smart highlights.',
      robots: 'index, follow',
      canonicalPath: '/',
      image: DEFAULT_IMAGE,
      type: 'website',
    };

    let config: SeoConfig = defaultConfig;

    if (path === '/discover') {
      config = {
        title: 'Discover Books | epigraphreader.com',
        description:
          'Discover new books, explore categories, and find your next PDF or EPUB read.',
        robots: 'index, follow',
        canonicalPath: '/discover',
        image: DEFAULT_IMAGE,
        type: 'website',
      };
    } else if (path === '/login') {
      config = {
        title: 'Login | epigraphreader.com',
        description: 'Sign in to sync your personal library and reading progress.',
        robots: 'noindex, nofollow',
        canonicalPath: '/login',
        image: DEFAULT_IMAGE,
        type: 'website',
      };
    } else if (path === '/admin' || path === '/settings' || path === '/profile' || path === '/stats') {
      config = {
        title: `${path.slice(1)} | epigraphreader.com`,
        description: 'User account area.',
        robots: 'noindex, nofollow',
        canonicalPath: path,
        image: DEFAULT_IMAGE,
        type: 'website',
      };
    } else if (path.startsWith('/read/')) {
      const id = path.split('/')[2];
      const book = books.find((b) => b.id === id);
      const title = cleanTitle(book?.title || 'Reader');
      const author = cleanAuthor(book?.author || '');
      config = {
        title: author ? `${title} - ${author} | Reader` : `${title} | Reader`,
        description: author
          ? `${title} by ${author} reading view.`
          : `${title} reading view.`,
        robots: 'noindex, nofollow',
        canonicalPath: path,
        image: book?.cover_url || DEFAULT_IMAGE,
        type: 'book',
      };
    } else if (path.startsWith('/book/')) {
      const id = path.split('/')[2];
      const book = books.find((b) => b.id === id);
      const title = cleanTitle(book?.title || 'Book Details');
      const author = cleanAuthor(book?.author || '');
      config = {
        title: author ? `${title} - ${author} | epigraphreader.com` : `${title} | epigraphreader.com`,
        description: author
          ? trimText(`Read ${title} by ${author} on epigraphreader.com.`)
          : trimText(`Read ${title} on epigraphreader.com.`),
        robots: 'index, follow',
        canonicalPath: path,
        image: book?.cover_url || DEFAULT_IMAGE,
        type: 'book',
      };
    } else if (path !== '/') {
      config = {
        title: 'Page Not Found | epigraphreader.com',
        description: 'The page you requested could not be found.',
        robots: 'noindex, nofollow',
        canonicalPath: path,
        image: DEFAULT_IMAGE,
        type: 'website',
      };
    }

    const canonicalUrl = `${BASE_URL}${config.canonicalPath || path}`;
    const description = trimText(config.description, 200);
    const robots = config.robots || 'index, follow';
    const image = resolveImage(config.image);
    const type = config.type || 'website';

    document.title = config.title;
    upsertCanonical(canonicalUrl);

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:title', config.title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', image);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:url', canonicalUrl);
    upsertMeta('name', 'twitter:title', config.title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [location.pathname, books]);

  return null;
}
