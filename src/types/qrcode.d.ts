declare module 'qrcode' {
    export interface QRCodeToDataURLOptions {
        type?: 'image/png' | 'image/jpeg' | 'image/webp';
        quality?: number;
        margin?: number;
        scale?: number;
        width?: number;
        color?: {
            dark?: string;
            light?: string;
        };
        errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    }

    export function toDataURL(
        text: string,
        options?: QRCodeToDataURLOptions
    ): Promise<string>;

    export function toDataURL(
        text: string,
        callback: (error: Error | null, url: string) => void
    ): void;

    export function toDataURL(
        text: string,
        options: QRCodeToDataURLOptions,
        callback: (error: Error | null, url: string) => void
    ): void;
}
