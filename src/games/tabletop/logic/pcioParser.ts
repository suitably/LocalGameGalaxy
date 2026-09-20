/** PlayingCards.io (.pcio) and Tabletop JSON Parser [ID: GAME-TABLETOP-PARSER] */
import { unzipSync } from 'fflate';
import type { TabletopGameDefinition } from './types';
import { validateAndSanitizeGame } from './gameValidator';
import { detectMimeType, uint8ArrayToBase64, resolveAssetUrl } from './pcioAssetUtils';
import { normalizePcioWidgets } from './pcioNormalizer';

export interface ParsePcioOptions {
  assetFiles?: Record<string, string>;
  defaultName?: string;
}

interface PcioRawState {
  version?: number | string;
  name?: string;
  description?: string;
  author?: string;
  table?: { width?: number; height?: number; background?: string; backgroundImageUrl?: string };
  widgets?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Parses a `.pcio` (ZIP ArrayBuffer) or a raw JSON string into a TabletopGameDefinition.
 */
export async function parsePcioFile(
  source: ArrayBuffer | string,
  options?: ParsePcioOptions,
): Promise<TabletopGameDefinition> {
  const assetFiles: Record<string, string> = { ...(options?.assetFiles || {}) };

  // Scenario 1: Source is a raw JSON string
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source) as PcioRawState;
      const isFlatWidgets = !parsed.widgets && Object.values(parsed).some(
        (v) => v && typeof v === 'object' && ('type' in v || 'cardTypes' in v || 'deck' in v),
      );
      const rawWidgets = (isFlatWidgets ? (parsed as Record<string, Record<string, unknown>>) : parsed.widgets) || {};
      const normalizedWidgets = normalizePcioWidgets(rawWidgets, assetFiles);

      let maxX = 0;
      let maxY = 0;
      for (const w of Object.values(normalizedWidgets)) {
        maxX = Math.max(maxX, w.x + w.width);
        maxY = Math.max(maxY, w.y + w.height);
      }

      const tableConfig = {
        width: parsed.table?.width || Math.max(1600, maxX + 80),
        height: parsed.table?.height || Math.max(1000, maxY + 80),
        backgroundImageUrl: resolveAssetUrl(parsed.table?.backgroundImageUrl || parsed.table?.background, assetFiles) || undefined,
      };

      return validateAndSanitizeGame({
        name: parsed.name || options?.defaultName || 'Importiertes Spiel',
        author: parsed.author,
        description: parsed.description,
        version: parsed.version,
        table: tableConfig,
        widgets: normalizedWidgets,
        assetFiles,
      });
    } catch (err) {
      throw new Error(`Ungültige Tabletop-JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Scenario 2: Source is an ArrayBuffer (ZIP archive)
  try {
    const uint8 = new Uint8Array(source);
    const unzipped = unzipSync(uint8);

    let stateJsonContent: string | null = null;

    for (const [filename, fileBytes] of Object.entries(unzipped)) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.json') && (lower.includes('template') || lower.includes('state') || lower.includes('manifest') || !stateJsonContent)) {
        stateJsonContent = new TextDecoder('utf-8').decode(fileBytes);
      } else {
        const mime = detectMimeType(fileBytes, filename);
        const dataUri = `data:${mime};base64,${uint8ArrayToBase64(fileBytes)}`;
        assetFiles[filename] = dataUri;
        const clean = filename.replace(/^\/+/, '');
        assetFiles[clean] = dataUri;
        assetFiles['/' + clean] = dataUri;
        assetFiles['assets/' + clean] = dataUri;
      }
    }

    if (!stateJsonContent) {
      throw new Error('Keine template.json oder state.json im .pcio Archiv gefunden');
    }

    return parsePcioFile(stateJsonContent, { assetFiles, defaultName: options?.defaultName });
  } catch (err) {
    throw new Error(`Fehler beim Entpacken der .pcio Datei: ${err instanceof Error ? err.message : String(err)}`);
  }
}
