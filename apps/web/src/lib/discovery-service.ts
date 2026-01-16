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

// OpenLibrary Cover Search
const searchOpenLibrary = async (title: string, author?: string): Promise<string | undefined> => {
    // OpenLibrary için temiz arama yap
    let query = `title=${encodeURIComponent(title)}`;
    if (author && !author.includes('Bilinmiyor') && !author.includes('LIBRARY')) {
        query += `&author=${encodeURIComponent(author)}`;
    }

    console.log(`OpenLibrary Searching: ${query}`);

    try {
        const response = await fetch(`https://openlibrary.org/search.json?${query}&limit=5`);
        const data = await response.json();
        console.log("Open Library sonucu:", data);

        if (data.docs && data.docs.length > 0) {
            // Cover ID'si olan ilk kitabı bul
            const bookWithCover = data.docs.find((doc: any) => doc.cover_i);
            if (bookWithCover) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${bookWithCover.cover_i}-L.jpg`;
                console.log("Open Library kapak:", coverUrl);
                return coverUrl;
            }
        }
    } catch (e) {
        console.error("OpenLibrary Error:", e);
    }
    return undefined;
};

// Geliştirilmiş Kapak Bulma (Google Books -> OpenLibrary Fallback)
export const findCoverImage = async (title: string, author: string = ''): Promise<string | undefined> => {
    console.log("Google Books araması başlıyor: title=", title, "author=", author);

    let foundCover: string | undefined = undefined;

    // 1. STRATEJİ: Google Books
    try {
        // Daha geniş bir arama için intitle/inauthor yerine genel arama yapalım ama terimleri tırnak içine alalım
        let q = `intitle:"${title}"`;
        if (author && author.length > 2 && !author.toUpperCase().includes('BILINMIYOR')) {
            q += `+inauthor:"${author}"`;
        }

        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3&printType=books`);
        const data = await response.json();
        console.log("Google Books sonucu:", data);

        if (data.items && data.items.length > 0) {
            // İlk geçerli kapağı bul
            for (const item of data.items) {
                if (item.volumeInfo?.imageLinks?.thumbnail) {
                    foundCover = getHighResCoverGoogle(item.volumeInfo);
                    console.log("Kapak bulundu (Google):", foundCover);
                    break;
                }
            }
        } else {
            console.log("Google Books'ta kapak yok");
        }
    } catch (e) {
        console.error("Google Books hatası:", e);
    }

    // 2. STRATEJİ: OpenLibrary (Fallback)
    // Eğer Google kapak bulamazsa VEYA bulduğu kapak "image not available" ise (bunu anlamak zor ama en azından Google null dönerse)
    if (!foundCover) {
        console.log("Google Books failed or no cover, trying OpenLibrary...");
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
