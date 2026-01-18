
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
    if (clean.includes(' - ') || clean.includes('_')) {
        const separator = clean.includes(' - ') ? ' - ' : '_';
        const parts = clean.split(separator).map(p => p.trim());
        return {
            title: cleanTitle(parts[0]),
            author: cleanAuthor(parts[1] || '')
        };
    }

    // Fallback: Just clean the string
    const normalized = clean.replace(/_/g, ' ').trim();
    return {
        title: cleanTitle(normalized),
        author: ''
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
    if (!text) return '';
    const normalized = text.trim();
    if (['Bilinmiyor', 'Biliniyor', 'Unknown', 'unknownAuthor', 'ANONIM', 'ANONYMOUS', 'LIBRARY', 'ADMIN'].includes(normalized.toUpperCase()) || normalized === '') {
        return '';
    }

    // Split by common delimiters and take the first one (usually the primary author)
    // Handle: "Author; Translator", "Author ve Author", "Author & Author"
    let clean = normalized
        .split(/[;|,]| ve | & /)[0]
        .replace(/\(.*\)/g, '')
        .replace(/[_\s]+/g, ' ')
        .trim();

    // Special case removal for common non-author keywords
    clean = clean.replace(/\b(evrilen|trans|çv|translator|çeviren|hazırlayan|yazar|author)\b/gi, '').trim();

    // Final check to ensure we didn't wipe everything
    const badAuthors = ['BILINMIYOR', 'UNKNOWN', 'ADMIN', 'LIBRARY', 'ANONIM'];
    if (badAuthors.includes(clean.toUpperCase()) || clean.length < 2) return '';

    return clean;
}

export function generateDynamicSummary(title: string, author: string): string {
    if (!author || author === '' || author === 'Bilinmiyor') {
        return `${title} eseri, okuyucuyu derin bir düşünce yolculuğuna davet ediyor. Evrensel temaları ve etkileyici diliyle, her kütüphanede bulunması gereken, ufuk açıcı bir başyapıt.`;
    }
    return `${author} tarafından kaleme alınan ${title}, edebiyat dünyasında iz bırakan eserlerden biri. Yazarın kendine has üslubuyla harmanlanan bu hikaye, okuyucuya hem sürükleyici bir kurgu hem de üzerine düşünülecek derin mesajlar sunuyor.`;
}
