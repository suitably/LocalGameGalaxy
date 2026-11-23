/**
 * Tabletop Game Exporter [ID: GAME-TABLETOP-EXPORTER]
 *
 * The share file of a game: `.json` (the definition) or `.pcio` (ZIP with `template.json` and
 * the embedded images). Both import again through `parsePcioFile` (`nativeGameFile.ts`).
 * Third-party imports are refused (`shareRules.ts`).
 */
import { zipSync, strToU8 } from 'fflate';
import type { TabletopGameDefinition } from './types';
import { sanitizeGameSlug } from './gameValidator';
import { assertShareable } from './shareRules';

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The `.json` share file. Throws `ShareBlockedError` for third-party imports. */
export function serializeGameJson(game: TabletopGameDefinition): string {
  assertShareable(game);
  return JSON.stringify(game, null, 2);
}

function dataUrlBytes(dataUrl: string): Uint8Array | null {
  if (!dataUrl.startsWith('data:')) return null;
  const parts = dataUrl.split(',');
  if (parts.length !== 2) return null;
  const binary = atob(parts[1]);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

/** The `.pcio` share file. Throws `ShareBlockedError` for third-party imports. */
export function buildPcioArchive(game: TabletopGameDefinition) {
  const zipRecord: Record<string, Uint8Array> = {
    'template.json': strToU8(serializeGameJson(game)),
  };
  for (const [name, dataUrl] of Object.entries(game.assetFiles ?? {})) {
    const bytes = dataUrlBytes(dataUrl);
    if (bytes) zipRecord[name] = bytes;
  }
  return zipSync(zipRecord);
}

export function exportGameAsJson(game: TabletopGameDefinition): void {
  const blob = new Blob([serializeGameJson(game)], { type: 'application/json' });
  triggerBrowserDownload(blob, `${sanitizeGameSlug(game.name)}.json`);
}

export function exportGameAsPcio(game: TabletopGameDefinition): void {
  const blob = new Blob([buildPcioArchive(game)], { type: 'application/octet-stream' });
  triggerBrowserDownload(blob, `${sanitizeGameSlug(game.name)}.pcio`);
}
