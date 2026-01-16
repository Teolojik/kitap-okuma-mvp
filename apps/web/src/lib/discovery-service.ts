// Google Books API Service for high quality covers and metadata
export interface SearchResult {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    source: string;
    format: 'epub' | 'pdf';
    size?: string;
    downloadUrl: string; // This will now point to external search or demo download
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

export const searchBooks = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    try {
        // Google Books API (No key required for public search)
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books`);
        const data = await response.json();

        if (!data.items) return [];

        return data.items.map((item: any) => {
            const info = item.volumeInfo;

            // High res cover logic: replace zoom=1 with zoom=0 or remove it
            let cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
            if (cover) {
                // Force HTTPS
                cover = cover.replace('http://', 'https://');
                // Try to get higher resolution
                // Note: content=true sometimes helps with full resolution
                cover = cover.replace('&zoom=1', '&zoom=0');
            }

            const isbn = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ||
                info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier;

            const searchQuerySafe = encodeURIComponent(`${info.title} ${info.authors ? info.authors[0] : ''}`);

            return {
                id: item.id,
                title: info.title,
                author: info.authors ? info.authors[0] : 'Bilinmeyen Yazar',
                cover_url: cover,
                source: 'Google Books',
                format: 'epub', // Default assumption for UI
                size: 'Bilinmiyor',
                downloadUrl: 'demo-download', // Handled by Discover.tsx
                description: info.description,
                publishedDate: info.publishedDate,
                publisher: info.publisher,
                isbn: isbn,
                language: info.language,
                externalLinks: {
                    annasArchive: `https://annas-archive.org/search?q=${searchQuerySafe}`,
                    libgen: `https://libgen.is/search.php?req=${searchQuerySafe}`
                }
            };
        });
    } catch (e) {
        console.error("Discovery Error:", e);
        return [];
    }
};
