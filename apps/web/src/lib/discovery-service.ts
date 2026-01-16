// Google Books API Service for high quality covers and metadata
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

// Helper to get high-res cover
const getHighResCover = (volumeInfo: any) => {
    let cover = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
    if (cover) {
        cover = cover.replace('http://', 'https://');
        cover = cover.replace('&zoom=1', '&zoom=0');
    }
    return cover;
};

// Geliştirilmiş Kapak Bulma (Gelişmiş Filtreleme + İlk 3 Sonuç)
export const findCoverImage = async (query: string, author?: string): Promise<string | undefined> => {
    try {
        let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=`;

        // Eğer yazar bilgisi varsa nokta atışı filtreleme yap
        if (author && author.length > 2 && !author.includes('Bilinmiyor')) {
            // Google Books Advanced Search Operators: intitle ve inauthor
            // Örn: intitle:Var Mısın+inauthor:Doğan Cüceloğlu
            const q = `intitle:${encodeURIComponent(query)}+inauthor:${encodeURIComponent(author)}`;
            apiUrl += `${q}&maxResults=3&printType=books`;
        } else {
            // Fallback: Sadece isme göre ara (ama tırnak içine alarak tam eşleşme zorla şansını dene)
            apiUrl += `${encodeURIComponent(query)}&maxResults=5&printType=books`;
        }

        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            for (const item of data.items) {
                const cover = getHighResCover(item.volumeInfo);
                // Ek kontrol: Kitap adı eşleşiyor mu? (Çok alakasız sonuçları elemek için basit bir kontrol)
                // const titleMatch = item.volumeInfo.title.toLowerCase().includes(query.toLowerCase().split(' ')[0]); 
                if (cover) {
                    return cover;
                }
            }
        }
    } catch (e) {
        console.error("Cover fetch error:", e);
    }
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
            const cover = getHighResCover(info);

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
