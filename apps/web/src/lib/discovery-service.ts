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
        cover = cover.replace('http://', 'https://');
        cover = cover.replace('&zoom=1', '&zoom=0');
    }
    return cover;
};

// OpenLibrary Cover Search
const searchOpenLibrary = async (title: string, author?: string): Promise<string | undefined> => {
    try {
        // OpenLibrary Search API
        // q=title+author
        let query = `title=${encodeURIComponent(title)}`;
        if (author && !author.includes('Bilinmiyor')) {
            query += `&author=${encodeURIComponent(author)}`;
        }

        const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=5`);
        const data = await response.json();

        if (data.docs && data.docs.length > 0) {
            // Cover ID'si olan ilk kitabı bul
            const bookWithCover = data.docs.find((doc: any) => doc.cover_i);
            if (bookWithCover) {
                // Large boyutta kapak URL'i oluştur
                return `https://covers.openlibrary.org/b/id/${bookWithCover.cover_i}-L.jpg`;
            }
        }
    } catch (e) {
        console.error("OpenLibrary Error:", e);
    }
    return undefined;
};

// Geliştirilmiş Kapak Bulma (Google Books -> OpenLibrary Fallback)
export const findCoverImage = async (query: string, author?: string): Promise<string | undefined> => {
    // 1. STRATEJİ: Google Books (Detaylı Arama)
    try {
        let googleQuery = `intitle:${encodeURIComponent(query)}`;
        if (author && author.length > 2 && !author.includes('Bilinmiyor')) {
            googleQuery += `+inauthor:${encodeURIComponent(author)}`;
        }

        // Önce Google'ı dene
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${googleQuery}&maxResults=3&printType=books`);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            for (const item of data.items) {
                const cover = getHighResCoverGoogle(item.volumeInfo);
                if (cover) return cover;
            }
        }
    } catch (e) {
        console.error("Google Books Error:", e);
    }

    // 2. STRATEJİ: OpenLibrary (Fallback)
    // Google bulamazsa veya hata verirse buraya düşer
    console.log("Google Books failed, trying OpenLibrary...");
    const olCover = await searchOpenLibrary(query, author);
    if (olCover) return olCover;

    return undefined;
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
