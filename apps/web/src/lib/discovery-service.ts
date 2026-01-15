
// Simulated search results from Anna's Archive / Libgen
export interface SearchResult {
    id: string;
    title: string;
    author: string;
    cover_url?: string;
    source: 'Anna\'s Archive' | 'Libgen';
    format: 'epub' | 'pdf';
    size: string;
    downloadUrl: string; // Real or proxied URL
    language?: string;
}

const MOCK_RESULTS: SearchResult[] = [
    {
        id: '1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        cover_url: 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
        source: 'Anna\'s Archive',
        format: 'epub',
        size: '1.2 MB',
        downloadUrl: 'mock-download-url'
    },
    {
        id: '2',
        title: '1984',
        author: 'George Orwell',
        cover_url: 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg',
        source: 'Libgen',
        format: 'pdf',
        size: '2.5 MB',
        downloadUrl: 'mock-download-url-2'
    },
    {
        id: '3',
        title: 'Dune',
        author: 'Frank Herbert',
        cover_url: 'https://m.media-amazon.com/images/I/81ym3QUd3KL._AC_UF1000,1000_QL80_.jpg',
        source: 'Anna\'s Archive',
        format: 'epub',
        size: '3.1 MB',
        downloadUrl: 'mock-download-url-3'
    }
];

// Real search using OpenLibrary API
export const searchBooks = async (query: string): Promise<SearchResult[]> => {
    if (!query) return [];

    try {
        // Fetch from OpenLibrary Search API
        const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();

        if (!data.docs) return [];

        return data.docs.map((doc: any) => ({
            id: doc.key,
            title: doc.title,
            author: doc.author_name ? doc.author_name[0] : 'Bilinmiyor',
            cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
            source: 'OpenLibrary (Public Domain)',
            format: 'epub', // Defaulting to epub for MVP flow
            size: 'Unknown',
            downloadUrl: `https://openlibrary.org${doc.key}`, // Link to book page
            language: doc.language ? doc.language[0] : undefined
        }));
    } catch (e) {
        console.error("Discovery Error:", e);
        // Fallback to mock if API fails
        return MOCK_RESULTS.filter(r =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.author.toLowerCase().includes(query.toLowerCase())
        );
    }
};
