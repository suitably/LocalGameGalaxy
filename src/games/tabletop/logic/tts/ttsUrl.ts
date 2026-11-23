/** TTS URL and CustomDeck helpers [ID: GAME-TABLETOP-TTS-PARSER] */
import type { TTSSaveFile, TTSObjectState, TTSCustomDeckEntry } from '../ttsTypes';

/**
 * Rewrites TTS asset URLs so the HTTPS PWA can load them (#693, D3):
 * - legacy Steam UGC `http(s)://cloud-N.steamusercontent.com/…` (403) → the CORS-enabled CDN
 *   `https://steamusercontent-a.akamaihd.net/…`;
 * - `http://` → `https://` for **every** host (mixed content is blocked on the PWA; a host
 *   without HTTPS shows up as dead in the asset report instead of silently blank).
 */
export function sanitizeTtsUrl(url?: string): string {
  const trimmed = url?.trim();
  if (!trimmed) return '';
  return trimmed
    .replace(
      /^https?:\/\/cloud-\d+\.steamusercontent\.com\//i,
      'https://steamusercontent-a.akamaihd.net/',
    )
    .replace(/^http:\/\//i, 'https://');
}

/** The custom table image of a save, when its table shows one. */
export function customTableImage(save: TTSSaveFile): string | undefined {
  return save.Table === 'Table_Custom' ? sanitizeTtsUrl(save.TableURL) || undefined : undefined;
}

/** Recursively collects all CustomDeck entries from the object tree */
export function collectCustomDecks(
  objects: TTSObjectState[],
  out: Record<string, TTSCustomDeckEntry>,
): void {
  for (const obj of objects) {
    if (obj.CustomDeck) {
      for (const [key, deck] of Object.entries(obj.CustomDeck)) {
        if (!out[key]) {
          out[key] = {
            ...deck,
            FaceURL: sanitizeTtsUrl(deck.FaceURL),
            BackURL: sanitizeTtsUrl(deck.BackURL),
          };
        }
      }
    }
    if (obj.ContainedObjects) {
      collectCustomDecks(obj.ContainedObjects, out);
    }
  }
}
