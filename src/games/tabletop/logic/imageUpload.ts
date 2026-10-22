/**
 * Uploaded images become small data URLs stored in the game [ID: LOGIC-TABLETOP-IMAGE-UPLOAD]
 *
 * Frontend-only: no server or asset store. Images are scaled down because the whole game state
 * travels through the sync channel (see sync-protocol).
 */
export const MAX_IMAGE_EDGE = 512;
export const IMAGE_QUALITY = 0.8;

/** Size that fits within `max` on both edges, keeping the aspect ratio; never upscales. */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Reads an image file, scales it with a canvas and returns a WebP (or PNG fallback) data URL. */
export async function fileToDataUrl(file: File, max = MAX_IMAGE_EDGE): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, max);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const webp = canvas.toDataURL('image/webp', IMAGE_QUALITY);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}
