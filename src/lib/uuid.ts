/**
 * Robust, cross-browser UUID v4 generator.
 * Works seamlessly in:
 * - Secure Contexts (HTTPS, localhost)
 * - Non-secure Contexts (HTTP on LAN, e.g. http://192.168.x.x:5173 on iOS/Android where crypto.randomUUID is undefined)
 * - Environments without full Web Crypto API support
 */
export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch {
            // Fall through if blocked by security policies
        }
    }

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        try {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            // RFC 4122 v4 compliance
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
        } catch {
            // Fall through
        }
    }

    // High-entropy math random fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
