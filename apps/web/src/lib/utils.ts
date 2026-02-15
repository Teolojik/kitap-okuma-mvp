import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getBrowserInfo(userAgent: string): string {
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    if (userAgent.includes('Trident')) return 'Internet Explorer';
    return 'Unknown Browser';
}

export function getPlatformInfo(userAgent: string, platform?: string): string {
    // Try to get from userAgent first as it's more descriptive than navigator.platform
    if (userAgent.includes('Win')) return 'Windows';
    if (userAgent.includes('Mac') && !userAgent.includes('iPhone') && !userAgent.includes('iPad')) return 'MacOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) return 'iOS';
    if (userAgent.includes('Linux')) return 'Linux';

    // Fallback to platform if userAgent fails
    if (platform) {
        if (platform.startsWith('Win')) return 'Windows';
        if (platform.startsWith('Mac')) return 'MacOS';
        if (platform.startsWith('Linux')) return 'Linux';
        return platform;
    }

    return 'Unknown Platform';
}

/**
 * Normalizes text extracted from PDF or EPUB readers.
 * Fixes hyphenated words across line breaks and cleans up overlapping whitespace.
 */
export function normalizeText(text: string): string {
    if (!text) return '';

    return text
        // 1. Join words broken by hyphens at end of lines/segments
        // Pattern: word- \n nextpart -> wordnextpart
        // Also handles "yardımla- şarak" -> "yardımlaşarak"
        .replace(/(\w)-\s+(\w)/g, '$1$2')
        // Pattern: word-\nnextpart -> wordnextpart
        .replace(/(\w)-\n+(\w)/g, '$1$2')
        // 2. Normalize multiple spaces and newlines into single spaces
        .replace(/\s+/g, ' ')
        .trim();
}
