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

// IMPROVED Find Cover Image
export const findCoverImage = async (title: string, author: string = ''): Promise<string | undefined> => {
    console.log("Exact match query requested: title=", title, "author=", author);

    let foundCover: string | undefined = undefined;

    // 1. STRATEJİ: Google Books (Strict Query)
    try {
        // Enforced strict quotes query
        // "intitle:ExactTitle" + "inauthor:ExactAuthor"
        let q = `intitle:"${title}"`;
        if (author && author.length > 2 && !author.toUpperCase().includes('BILINMIYOR')) {
            q += `+inauthor:"${author}"`;
        }

        console.log("Exact match query:", q);

        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`);
        const data = await response.json();

        let filtered: any[] = [];
        let selectedCover = null;

        if (data.items && data.items.length > 0) {
            let bestItem = null;
            let maxScore = 0;

            for (const item of data.items) {
                if (!item.volumeInfo?.imageLinks?.thumbnail) continue;

                const score = calculateStrictRelevance(
                    item.volumeInfo.title,
                    item.volumeInfo.authors || [],
                    title,
                    author
                );

                filtered.push({ title: item.volumeInfo.title, authors: item.volumeInfo.authors, score });

                if (score > maxScore) {
                    maxScore = score;
                    bestItem = item;
                }
            }

            console.log("Filtered results:", filtered);

            if (bestItem && maxScore >= 50) {
                selectedCover = getHighResCoverGoogle(bestItem.volumeInfo);
                console.log("Selected cover:", selectedCover, "Score:", maxScore);
                foundCover = selectedCover;
            } else {
                console.log("No exact match in Google Books (Highest Score < 50)");
            }
        } else {
            console.log("No exact match in Google Books (Zero Results)");
        }
    } catch (e) {
        console.error("Google Books hatası:", e);
    }

    // 2. STRATEJİ: OpenLibrary (Fallback)
    if (!foundCover) {
        console.log("Google Books failed/nomatch, trying OpenLibrary fallback...");
        foundCover = await searchOpenLibrary(title, author);
    }

    return foundCover;
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
