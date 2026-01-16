
/**
 * Utility to clean and parse book metadata from filenames or raw strings.
 * Specifically targets academic/archive sources like Anna's Archive, LibGen, etc.
 */

export interface ParsedMetadata {
    title: string;
    author: string;
    publisher?: string;
    year?: string;
    isbn?: string;
}

export function parseBookFilename(filename: string): ParsedMetadata {
    // 1. Remove extension
    let clean = filename.replace(/\.(epub|pdf)$/i, '');

    // 2. Handle common delimiters: --, _, [], ()
    // Pattern: Title -- Author -- Other
    if (clean.includes(' -- ')) {
        const parts = clean.split(' -- ').map(p => p.trim());
        if (parts.length >= 2) {
            return {
                title: cleanTitle(parts[0]),
                author: cleanAuthor(parts[1]),
                publisher: parts.find(p => /kitap|yayın|press|pub/i.test(p)),
                year: parts.find(p => /^\d{4}$/.test(p)),
                isbn: parts.find(p => /^\d{10,13}$/.test(p))
            };
        }
    }

    // Pattern: Author - Title (or vice versa)
    if (clean.includes(' - ')) {
        const parts = clean.split(' - ').map(p => p.trim());
        // Simple heuristic: if one side has fewer words, it might be the author
        // Or if one side contains known publisher keywords
        return {
            title: cleanTitle(parts[0]),
            author: cleanAuthor(parts[1] || 'Bilinmiyor')
        };
    }

    // Fallback: Just clean the string and try to split by '_' or space if it looks like Author_Title
    const normalized = clean.replace(/_/g, ' ').trim();
    return {
        title: cleanTitle(normalized),
        author: 'Bilinmiyor'
    };
}

export function cleanTitle(text: string): string {
    return text
        .replace(/\[.*\]/g, '') // Remove [Anna's Archive] etc
        .replace(/\(.*\)/g, '')
        .replace(/[_\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function cleanAuthor(text: string): string {
    if (!text || text === 'Bilinmiyor') return 'Bilinmiyor';
    return text
        .replace(/\(.*\)/g, '')
        .replace(/[_\s]+/g, ' ')
        .trim();
}

export function generateDynamicSummary(title: string, author: string): string {
    if (!author || author === 'Bilinmiyor') {
        return `${title} eseri, okuyucuyu derin bir düşünce yolculuğuna davet ediyor. Evrensel temaları ve etkileyici diliyle, her kütüphanede bulunması gereken, ufuk açıcı bir başyapıt.`;
    }
    return `${author} tarafından kaleme alınan ${title}, edebiyat dünyasında iz bırakan eserlerden biri. Yazarın kendine has üslubuyla harmanlanan bu hikaye, okuyucuya hem sürükleyici bir kurgu hem de üzerine düşünülecek derin mesajlar sunuyor.`;
}
