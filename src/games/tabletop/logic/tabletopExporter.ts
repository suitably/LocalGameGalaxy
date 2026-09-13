/**
 * Tabletop Game Exporter [ID: GAME-TABLETOP-EXPORTER]
 */
import { zipSync, strToU8 } from 'fflate';
import type { TabletopGameDefinition } from './types';
import { sanitizeGameSlug } from './gameValidator';

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

export function exportGameAsJson(game: TabletopGameDefinition): void {
  const jsonString = JSON.stringify(game, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = `${sanitizeGameSlug(game.name)}.json`;
  triggerBrowserDownload(blob, filename);
}

export function exportGameAsPcio(game: TabletopGameDefinition): void {
  const zipRecord: Record<string, Uint8Array> = {
    'template.json': strToU8(JSON.stringify(game, null, 2)),
  };

  if (game.assetFiles) {
    for (const [name, dataUrl] of Object.entries(game.assetFiles)) {
      if (dataUrl.startsWith('data:')) {
        const parts = dataUrl.split(',');
        if (parts.length === 2) {
          const binary = atob(parts[1]);
          const u8 = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            u8[i] = binary.charCodeAt(i);
          }
          zipRecord[name] = u8;
        }
      }
    }
  }

  const zipBytes = zipSync(zipRecord);
  const blob = new Blob([zipBytes], { type: 'application/octet-stream' });
  const filename = `${sanitizeGameSlug(game.name)}.pcio`;
  triggerBrowserDownload(blob, filename);
}
