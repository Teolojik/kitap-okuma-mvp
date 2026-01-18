export interface DiscoveryResult {
    url: string;
    author?: string;
}

export interface SearchResult {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    source: string;
    format: 'epub' | 'pdf';
    size?: string;
    downloadUrl: string;
    description?: string;
    publishedDate?: string;
    publisher?: string;
    isbn?: string;
    language?: string;
    externalLinks?: {
        annasArchive: string;
        libgen: string;
    };
}

// Helper to get high-res cover from Google
const getHighResCoverGoogle = (volumeInfo: any) => {
    let cover = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
    if (cover) {
        // Force https
        cover = cover.replace('http://', 'https://');
        // Force high resolution (zoom=0 is usually larger/original)
        cover = cover.replace('&zoom=1', '&zoom=0');
        // Remove edge (curl) modifier if present
        cover = cover.replace('&edge=curl', '');
    }
    return cover;
};

// Normalize Helper
const normalize = (str: string) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
const normalizeSimple = (str: string) => str ? str.toLowerCase().trim() : '';

// Helper to check if image URL is valid and loadable
const isImageValid = (url: string): Promise<boolean> => {
    if (!url) return Promise.resolve(false);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.width > 10 && img.height > 10); // Check if it's not a pixel or placeholder
        img.onerror = () => resolve(false);
        img.src = url;
        // Timeout for robustness
        setTimeout(() => resolve(false), 5000);
    });
};

// STRICT Relevance Score (Exact Match Preferring)
const calculateStrictRelevance = (itemTitle: string, itemAuthors: string[], searchTitle: string, searchAuthor?: string) => {
    let score = 0;

    const iTitle = normalizeSimple(itemTitle);
    const qTitle = normalizeSimple(searchTitle);

    // Strict Title Check: Must include the search title
    // Example: "Var Mısın?" -> "Var Mısın Güçlü Bir Yaşam İçin" (Match!)
    if (iTitle.includes(qTitle)) score += 50;

    // Strict Author Check
    if (searchAuthor && itemAuthors.length > 0) {
        const qAuthor = normalizeSimple(searchAuthor);
        const hasAuthor = itemAuthors.some(a => normalizeSimple(a).includes(qAuthor));
        if (hasAuthor) score += 50;
    }

    return score;
};

// OpenLibrary Cover Search
const searchOpenLibrary = async (title: string, author?: string): Promise<{ url: string; author?: string } | undefined> => {
    let query = `title=${encodeURIComponent(title)}`;
    if (author && author.length > 2 && !author.toLowerCase().includes('bilinimiyor') && !author.toLowerCase().includes('unknown')) {
        query += `&author=${encodeURIComponent(author)}`;
    }

    console.log(`OpenLibrary Searching: ${query}`);

    try {
        const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=10`);
        const data = await response.json();

        if (data.docs && data.docs.length > 0) {
            let bestMatch = null;
            let maxScore = 0;

            for (const doc of data.docs) {
                if (!doc.cover_i) continue;

                const score = calculateStrictRelevance(
                    doc.title,
                    doc.author_name || [],
                    title,
                    author
                );

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = doc;
                }
            }

            if (bestMatch && maxScore >= 50) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${(bestMatch as any).cover_i}-L.jpg`;
                return {
                    url: coverUrl,
                    author: (bestMatch as any).author_name?.[0]
                };
            }
        }
    } catch (e) {
        console.error("OpenLibrary Error:", e);
    }
    return undefined;
};

const searchKitapyurdu = async (title: string, author: string): Promise<{ url: string; author?: string } | undefined> => {
    const query = `${title} ${author}`.trim();
    const targetUrl = `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${encodeURIComponent(query)}`;

    // Primary: AllOrigins Raw (Usually most stable)
    // Secondary: CORSProxy.io (Fallback)
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) continue;

            const htmlText = await response.text();
            if (htmlText && htmlText.includes('product-cr')) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, "text/html");

                const imgElement = doc.querySelector('.product-cr .cover .image img');
                const authorElement = doc.querySelector('.product-cr .author');

                if (imgElement) {
                    let src = imgElement.getAttribute('src');
                    let foundAuthor = authorElement?.textContent?.trim();

                    if (src) {
                        src = src.replace(/wi:\d+/, 'wi:600');
                        // Trust Kitapyurdu images directly to avoid CORS HEAD check failure
                        return { url: src, author: foundAuthor };
                    }
                }
            }
        } catch (e) {
            console.warn("Proxy attempt failed:", e);
        }
    }
    return undefined;
};

// Geliştirilmiş Kapak Bulma (Türkçe Öncelikli -> Google -> OpenLibrary -> Default)
export const findCoverImage = async (title: string, author: string = ''): Promise<DiscoveryResult> => {
    console.log("Cover Search Started for:", title, "Author:", author);
    const defaultPlaceholder = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";

    // 0. STRATEJİ: Hardcoded Fallback
    const normalizedAuthor = normalizeSimple(author);
    if (normalizedAuthor.includes('dogancuceloghu') || normalizedAuthor.includes('cuceloghu')) {
        return { url: "https://i.dr.com.tr/cache/600x600-0/originals/0000000676440-1.jpg", author: "Doğan Cüceloğlu" };
    }

    // RUN STRATEGIES IN PARALLEL FOR MAXIMUM SPEED
    const strategies = [
        searchKitapyurdu(title, author),
        (async () => {
            try {
                let q = `intitle:"${title}"`;
                if (author && author.length > 2 && !author.toLowerCase().includes('bilinmiyor')) {
                    q += `+inauthor:"${author}"`;
                }
                const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`);
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                    for (const item of data.items) {
                        const info = item.volumeInfo;
                        if (!info?.imageLinks?.thumbnail) continue;
                        const score = calculateStrictRelevance(info.title, info.authors || [], title, author);
                        if (score >= 40) {
                            const url = getHighResCoverGoogle(info);
                            if (url && await isImageValid(url)) return { url, author: info.authors?.[0] };
                        }
                    }
                }
            } catch (e) { }
            return undefined;
        })(),
        searchOpenLibrary(title, author)
    ];

    const results = await Promise.all(strategies);
    const bestResult = results.find(r => r && r.url);

    if (bestResult) return bestResult;

    console.log("All strategies failed. Returning Default Placeholder Cover.");
    return { url: defaultPlaceholder };
};

export const searchBooks = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books`);
        const data = await response.json();

        if (!data.items) return [];

        return data.items.map((item: any) => {
            const info = item.volumeInfo;
            const cover = getHighResCoverGoogle(info);

            const isbn = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ||
                info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;

            const searchQuerySafe = encodeURIComponent(`${info.title} ${info.authors ? info.authors[0] : ''}`);

            return {
                id: item.id,
                title: info.title,
                author: info.authors ? info.authors[0] : 'Bilinmeyen Yazar',
                cover_url: cover,
                source: 'Google Books',
                format: 'epub',
                size: 'Bilinmiyor',
                downloadUrl: 'demo-download',
                description: info.description,
                publishedDate: info.publishedDate,
                publisher: info.publisher,
                isbn: isbn,
                language: info.language,
                externalLinks: {
                    annasArchive: `https://annas-archive.li/search?q=${searchQuerySafe}`,
                    libgen: `https://libgen.li/index.php?req=${searchQuerySafe}&columns%5B%5D=t&columns%5B%5D=a&columns%5B%5D=s&columns%5B%5D=y&columns%5B%5D=p&columns%5B%5D=i&objects%5B%5D=f&objects%5B%5D=e&objects%5B%5D=s&objects%5B%5D=a&objects%5B%5D=p&objects%5B%5D=w&topics%5B%5D=l&topics%5B%5D=c&topics%5B%5D=f&topics%5B%5D=a&topics%5B%5D=m&topics%5B%5D=r&topics%5B%5D=s&res=25`
                }
            };
        });
    } catch (e) {
        console.error("Discovery Error:", e);
        return [];
    }
};

// Helper to migrate legacy/broken proxy URLs on the fly
export const getCleanCoverUrl = (url?: string): string => {
    if (!url) return "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";

    // Migrate broken legacy corsproxy.io links
    if (url.includes('corsproxy.io')) {
        const match = url.match(/\?(.*)/);
        if (match && match[1]) {
            try {
                const decoded = decodeURIComponent(match[1]);
                return `https://api.allorigins.win/raw?url=${encodeURIComponent(decoded)}`;
            } catch (e) { return url; }
        }
    }

    return url;
};
