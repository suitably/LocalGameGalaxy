/**
 * Generates a lightweight base64 JPEG thumbnail from an image File or Blob
 * for fast WebRTC transfer to remote clients (phones).
 */
export async function createCoverThumbnail(file: Blob, maxSize = 120): Promise<string | undefined> {
    try {
        if (typeof document === 'undefined') return undefined;

        if (typeof createImageBitmap === 'function') {
            const bitmap = await createImageBitmap(file);
            const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
            const w = Math.max(1, Math.round(bitmap.width * scale));
            const h = Math.max(1, Math.round(bitmap.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return undefined;
            ctx.drawImage(bitmap, 0, 0, w, h);
            if ('close' in bitmap) {
                bitmap.close();
            }
            return canvas.toDataURL('image/jpeg', 0.65);
        }

        return new Promise<string | undefined>((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                const w = Math.max(1, Math.round(img.width * scale));
                const h = Math.max(1, Math.round(img.height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(undefined);
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.65));
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(undefined);
            };
            img.src = url;
        });
    } catch {
        return undefined;
    }
}
