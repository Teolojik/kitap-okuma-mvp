// Google Books API & OpenLibrary API Service
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
const searchOpenLibrary = async (title: string, author?: string): Promise<string | undefined> => {
    let query = `title=${encodeURIComponent(title)}`;
    if (author && !author.includes('Bilinmiyor') && !author.includes('LIBRARY')) {
        query += `&author=${encodeURIComponent(author)}`;
    }

    console.log(`OpenLibrary Searching: ${query}`);

    try {
        const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=10`);
        const data = await response.json();
        console.log("Open Library sonucu:", data);

        if (data.docs && data.docs.length > 0) {
            let bestMatch = null;
            let maxScore = 0;

            data.docs.forEach((doc: any) => {
                if (!doc.cover_i) return;

                const score = calculateStrictRelevance(
                    doc.title,
                    doc.author_name || [],
                    title,
                    author
                );

                console.log(`OL Candidate: ${doc.title} (${doc.author_name}) - Score: ${score}`);

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = doc;
                }
            });

            // Must be exact match (Title + Author = 100) or at least Title (50) match
            if (bestMatch && maxScore >= 50) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${(bestMatch as any).cover_i}-L.jpg`;
                console.log("Open Library Winner:", coverUrl, "Score:", maxScore);
                return coverUrl;
            }
        }
    } catch (e) {
        console.error("OpenLibrary Error:", e);
    }
    return undefined;
};

// CORS Proxy ile Kitapyurdu'ndan Kapak Çekme
const searchKitapyurdu = async (title: string, author: string): Promise<string | undefined> => {
    const query = `${title} ${author}`;
    // Using a more stable CORS proxy
    const targetUrl = `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${encodeURIComponent(query)}`;
    console.log("Kitapyurdu Searching via CORSProxy.io:", targetUrl);

    try {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        const htmlText = await response.text();

        if (htmlText) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            const imgElement = doc.querySelector('.product-cr .cover .image img');
            if (imgElement) {
                let src = imgElement.getAttribute('src');
                if (src) {
                    src = src.replace(/wi:\d+/, 'wi:600');
                    const isValid = await isImageValid(src);
                    if (isValid) {
                        console.log("Kitapyurdu cover found & verified:", src);
                        return src;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Kitapyurdu search failed:", e);
    }
    return undefined;
};

// Geliştirilmiş Kapak Bulma (Türkçe Öncelikli -> Google -> OpenLibrary -> Default)
export const findCoverImage = async (title: string, author: string = ''): Promise<string | undefined> => {
    console.log("Cover Search Started for:", title, "Author:", author);

    // 0. STRATEJİ: Hardcoded Fallback (Popüler / Sorunlu Yazarlar İçin)
    // Acil durumlar için manuel tanımlamalar
    const normalizedAuthor = normalizeSimple(author);
    if (normalizedAuthor.includes('dogancuceloghu') || normalizedAuthor.includes('cuceloghu') ||
        normalizedAuthor.includes('dogan cuceloglu') || normalizedAuthor.includes('cuceloglu')) {
        const fallback = "https://i.dr.com.tr/cache/600x600-0/originals/0000000676440-1.jpg"; // Var Mısın kapağı
        console.log("Hardcoded fallback triggered for Doğan Cüceloğlu:", fallback);
        return fallback;
    }

    let foundCover: string | undefined = undefined;

    // 1. STRATEJİ: Kitapyurdu / D&R (Türkçe Kitaplar İçin En İyisi)
    // Eğer yazar ismi Türkçe karakter içeriyorsa veya bilindiksse önce burayı dene
    try {
        foundCover = await searchKitapyurdu(title, author);
        if (foundCover) return foundCover;
    } catch (e) {
        console.log("Turkish source search failed, moving to global...", e);
    }

    // 2. STRATEJİ: Google Books (Strict Query)
    if (!foundCover) {
        try {
            let q = `intitle:"${title}"`;
            if (author && author.length > 2 && !author.toUpperCase().includes('BILINMIYOR')) {
                q += `+inauthor:"${author}"`;
            }

            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    if (!item.volumeInfo?.imageLinks?.thumbnail) continue;

                    const score = calculateStrictRelevance(
                        item.volumeInfo.title,
                        item.volumeInfo.authors || [],
                        title,
                        author
                    );

                    if (score >= 40) { // Slightly lower threshold for Google
                        const url = getHighResCoverGoogle(item.volumeInfo);
                        if (url && await isImageValid(url)) {
                            foundCover = url;
                            console.log("Google Books winner verified:", url);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Google Books error:", e);
        }
    }

    // 3. STRATEJİ: OpenLibrary (Fallback)
    if (!foundCover) {
        console.log("Trying OpenLibrary fallback...");
        const url = await searchOpenLibrary(title, author);
        if (url && await isImageValid(url)) {
            foundCover = url;
        }
    }

    if (foundCover) return foundCover;

    // 4. SON ÇARE: Default Unsplash Image (High Quality)
    console.log("All strategies failed. Returning Default Placeholder Cover.");
    return "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80";
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
