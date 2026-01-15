export function getFileType(data: string | ArrayBuffer, title: string): 'pdf' | 'epub' {
    if (typeof data === 'string') {
        // Base64 or URL
        if (data.startsWith('data:application/pdf')) return 'pdf';
        if (data.endsWith('.pdf')) return 'pdf';
    } else if (data instanceof ArrayBuffer) {
        // Check for PDF magic bytes: %PDF (25 50 44 46)
        const arr = new Uint8Array(data.slice(0, 4));
        if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) {
            return 'pdf';
        }
    }

    // Fallback to title extension
    if (title.toLowerCase().endsWith('.pdf')) return 'pdf';

    // Default to epub
    return 'epub';
}
