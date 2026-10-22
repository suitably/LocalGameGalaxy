/** PlayingCards.io (.pcio), Tabletop JSON, and TTS Save File Parser [ID: GAME-TABLETOP-PARSER] */
import { unzipSync } from 'fflate';
import type { TabletopGameDefinition } from './types';
import { validateAndSanitizeGame } from './gameValidator';
import { detectMimeType, uint8ArrayToBase64, resolveAssetUrl } from './pcioAssetUtils';
import { normalizePcioWidgets } from './pcioNormalizer';
import { isTtsSaveFile, parseTtsSaveFile } from './ttsParser';
import type { TTSSaveFile } from './ttsTypes';

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
/**
 * The game JSON inside an archive: PCIO's `template.json`/`widgets.json`, a state file, or
 * VirtualTabletop's first variant (`0.json`, then the lowest number); never an asset map.
 */
export function pickStateJson(filenames: string[]): string | null {
  const json = filenames.filter((f) => f.toLowerCase().endsWith('.json') && !/asset-?map/i.test(f));
  const named = json.find((f) => /template|state|widgets|manifest/i.test(f.split('/').pop() || ''));
  if (named) return named;
  const variants = json
    .map((f) => ({ f, n: Number((f.split('/').pop() || '').replace(/\.json$/i, '')) }))
    .filter((v) => Number.isInteger(v.n))
    .sort((a, b) => a.n - b.n);
  return variants[0]?.f ?? json[0] ?? null;
}

/** Name, rules and player range from VirtualTabletop's `_meta.info` (`players: "2-6"`). */
export function readVttMeta(rawMeta: unknown): {
  name?: string;
  ruleText?: string;
  minPlayers?: number;
  maxPlayers?: number;
} {
  const info = (rawMeta as { info?: Record<string, unknown> } | undefined)?.info;
  if (!info || typeof info !== 'object') return {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const range = /^(\d+)\s*(?:-\s*(\d+))?/.exec(String(info.players ?? ''));
  const min = range ? Number(range[1]) : undefined;
  return {
    name: str(info.name),
    ruleText: str(info.rules),
    minPlayers: min,
    maxPlayers: range ? Number(range[2] ?? range[1]) : undefined,
  };
}

export async function parsePcioFile(
  source: ArrayBuffer | string,
  options?: ParsePcioOptions,
): Promise<TabletopGameDefinition> {
  const assetFiles: Record<string, string> = { ...(options?.assetFiles || {}) };

  // Scenario 1: Source is a raw JSON string
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source) as PcioRawState;

      // Auto-detect TTS save file format (SaveName + ObjectStates)
      if (isTtsSaveFile(parsed)) {
        return parseTtsSaveFile(parsed as unknown as TTSSaveFile, {
          defaultName: options?.defaultName,
        });
      }

      const isFlatWidgets =
        !parsed.widgets &&
        Object.values(parsed).some(
          (v) => v && typeof v === 'object' && ('type' in v || 'cardTypes' in v || 'deck' in v),
        );
      const allWidgets =
        (isFlatWidgets ? (parsed as Record<string, Record<string, unknown>>) : parsed.widgets) ||
        {};
      // VirtualTabletop keeps game info under `_meta`; it is not a widget.
      const { _meta: rawMeta, ...rawWidgets } = allWidgets;
      const meta = readVttMeta(rawMeta);
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
        backgroundImageUrl:
          resolveAssetUrl(
            parsed.table?.backgroundImageUrl || parsed.table?.background,
            assetFiles,
          ) || undefined,
      };

      const infoObj = parsed.info as Record<string, unknown> | undefined;
      let ruleText: string | undefined =
        typeof parsed.ruleText === 'string'
          ? parsed.ruleText
          : typeof infoObj?.ruleText === 'string'
            ? (infoObj.ruleText as string)
            : meta.ruleText;

      if (!ruleText) {
        for (const raw of Object.values(rawWidgets)) {
          if (raw && typeof raw.ruleText === 'string' && raw.ruleText.trim()) {
            ruleText = raw.ruleText.trim();
            break;
          }
        }
      }

      return validateAndSanitizeGame({
        name: parsed.name || meta.name || options?.defaultName || 'Importiertes Spiel',
        minPlayers: meta.minPlayers,
        maxPlayers: meta.maxPlayers,
        author: parsed.author,
        description: parsed.description,
        version: parsed.version,
        table: tableConfig,
        widgets: normalizedWidgets,
        assetFiles,
        ruleText,
      });
    } catch (err) {
      throw new Error(
        `Ungültige Tabletop-JSON: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Scenario 2: Source is an ArrayBuffer (ZIP archive)
  try {
    const uint8 = new Uint8Array(source);
    const unzipped = unzipSync(uint8);

    let stateJsonContent: string | null = null;

    const stateFile = pickStateJson(Object.keys(unzipped));
    if (stateFile) stateJsonContent = new TextDecoder('utf-8').decode(unzipped[stateFile]);

    for (const [filename, fileBytes] of Object.entries(unzipped)) {
      if (filename.toLowerCase().endsWith('.json')) continue;
      const mime = detectMimeType(fileBytes, filename);
      const dataUri = `data:${mime};base64,${uint8ArrayToBase64(fileBytes)}`;
      assetFiles[filename] = dataUri;
      const clean = filename.replace(/^\/+/, '');
      assetFiles[clean] = dataUri;
      assetFiles['/' + clean] = dataUri;
      assetFiles['assets/' + clean] = dataUri;
    }

    if (!stateJsonContent) {
      throw new Error('Keine template.json oder state.json im .pcio Archiv gefunden');
    }

    return parsePcioFile(stateJsonContent, { assetFiles, defaultName: options?.defaultName });
  } catch (err) {
    throw new Error(
      `Fehler beim Entpacken der .pcio Datei: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
