/**
 * PlayingCards.io (.pcio) and Tabletop JSON Parser [ID: GAME-TABLETOP-PARSER]
 */
import { unzipSync } from 'fflate';
import type { TabletopGameDefinition, TabletopWidget, CardWidget, DeckWidget, HolderWidget, DieWidget } from './types';
import { validateAndSanitizeGame } from './gameValidator';

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

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function detectMimeType(bytes: Uint8Array, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'gif': return 'image/gif';
  }

  if (bytes.length >= 3) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image/webp';
    if (
      (bytes[0] === 0x3c && bytes[1] === 0x3f && bytes[2] === 0x78) ||
      (bytes[0] === 0x3c && bytes[1] === 0x73 && bytes[2] === 0x76)
    ) {
      return 'image/svg+xml';
    }
  }

  return 'image/png';
}

export function resolveAssetUrl(nameOrPath: unknown, assetFiles?: Record<string, string>): string | null {
  if (typeof nameOrPath !== 'string' || !nameOrPath.trim()) return null;
  const str = nameOrPath.trim();
  if (str.startsWith('data:') || str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  if (!assetFiles) return null;
  if (assetFiles[str]) return assetFiles[str];

  const clean = str.replace(/^\/+/, '');
  if (assetFiles[clean]) return assetFiles[clean];
  if (assetFiles['/' + clean]) return assetFiles['/' + clean];
  if (assetFiles['assets/' + clean]) return assetFiles['assets/' + clean];

  const base = str.split('/').pop()?.toLowerCase();
  for (const [key, dataUri] of Object.entries(assetFiles)) {
    if (key.toLowerCase() === str.toLowerCase()) return dataUri;
    const keyClean = key.replace(/^\/+/, '').toLowerCase();
    if (keyClean === clean.toLowerCase()) return dataUri;
    if (base && key.split('/').pop()?.toLowerCase() === base) return dataUri;
  }
  return null;
}

/**
 * Normalizes PlayingCards.io widget structures into Galaxy Tabletop Widgets.
 */
export function normalizePcioWidgets(
  rawWidgets: Record<string, Record<string, unknown>>,
  assetFiles?: Record<string, string>,
): Record<string, TabletopWidget> {
  const normalized: Record<string, TabletopWidget> = {};

  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    const rawType = String(raw.type || '').toLowerCase();
    const x = typeof raw.x === 'number' ? raw.x : 0;
    const y = typeof raw.y === 'number' ? raw.y : 0;
    const width = typeof raw.width === 'number' && raw.width > 0 ? raw.width : 80;
    const height = typeof raw.height === 'number' && raw.height > 0 ? raw.height : 120;
    const zIndex = typeof raw.zIndex === 'number' ? raw.zIndex : (typeof raw.z === 'number' ? raw.z : 1);
    const label = typeof raw.label === 'string' ? raw.label : (typeof raw.text === 'string' ? raw.text : undefined);

    if (rawType.includes('deck') || rawType === 'carddeck') {
      const cardIds = Array.isArray(raw.cardIds) ? (raw.cardIds as string[]) : [];
      const deckBackImg = resolveAssetUrl(raw.backImage || raw.image || raw.back, assetFiles);
      normalized[id] = {
        id,
        type: 'deck',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id || 'Ziehstapel',
        cardIds,
        backContent: deckBackImg
          ? { type: 'image', value: deckBackImg }
          : { type: 'text', value: '🂠', color: '#1565c0' },
      } as DeckWidget;
    } else if (rawType.includes('hand') || rawType === 'cardhand') {
      const seat = typeof raw.seat === 'number' ? raw.seat : (typeof raw.player === 'number' ? raw.player : 0);
      normalized[id] = {
        id,
        type: 'holder',
        x,
        y,
        width: Math.max(width, 240),
        height: Math.max(height, 140),
        zIndex,
        label: label || `Hand Spieler ${seat + 1}`,
        dropTargetTypes: ['card'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'fan',
        isHand: true,
        ownerSeat: seat,
      } as HolderWidget;
    } else if (rawType.includes('holder') || rawType === 'zone' || rawType.includes('pile') || rawType === 'seat') {
      normalized[id] = {
        id,
        type: 'holder',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id || 'Ablage',
        dropTargetTypes: ['card', 'token'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'stack',
        dropTarget: true,
      } as HolderWidget;
    } else if (rawType === 'dice' || rawType === 'die') {
      normalized[id] = {
        id,
        type: 'die',
        x,
        y,
        width: Math.max(width, 48),
        height: Math.max(height, 48),
        zIndex,
        label,
        currentValue: typeof raw.value === 'number' ? raw.value : 1,
        sides: typeof raw.sides === 'number' ? raw.sides : 6,
        color: typeof raw.color === 'string' ? raw.color : '#ffffff',
      } as DieWidget;
    } else if (rawType.includes('card') || raw.cardType || raw.deck) {
      const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
      const deckObj = deckId ? (rawWidgets[deckId] as Record<string, unknown> | undefined) : undefined;
      const cardTypeKey = typeof raw.cardType === 'string' ? raw.cardType : undefined;
      const cardTypeObj = deckObj?.cardTypes && typeof deckObj.cardTypes === 'object' && cardTypeKey
        ? (deckObj.cardTypes as Record<string, Record<string, unknown>>)[cardTypeKey]
        : undefined;

      const cardTypeImg = cardTypeObj
        ? (cardTypeObj.image || cardTypeObj.resource || cardTypeObj.face || cardTypeObj.background)
        : undefined;

      const frontRaw = raw.frontImage || raw.image || raw.faceImage || raw.front || raw.face || cardTypeImg;
      const frontImg = resolveAssetUrl(frontRaw, assetFiles);
      const backRaw = raw.backImage || raw.back || deckObj?.backImage || deckObj?.image;
      const backImg = resolveAssetUrl(backRaw, assetFiles);

      const cardLabel = label || (cardTypeObj?.text as string) || (cardTypeObj?.number ? String(cardTypeObj.number) : undefined) || cardTypeKey || 'Karte';

      normalized[id] = {
        id,
        type: 'card',
        x,
        y,
        width,
        height,
        zIndex,
        label: cardLabel,
        deckId,
        frontContent: frontImg
          ? { type: 'image', value: frontImg }
          : {
              type: typeof raw.frontImage === 'string' ? 'image' : 'text',
              value: String(frontRaw || cardLabel),
            },
        backContent: backImg
          ? { type: 'image', value: backImg }
          : {
              type: typeof raw.backImage === 'string' ? 'image' : 'text',
              value: String(raw.backImage || '🂠'),
              color: '#1565c0',
            },
        faceUp: raw.faceUp !== false,
        rotation: typeof raw.rotation === 'number' ? raw.rotation : 0,
      } as CardWidget;
    } else {
      normalized[id] = {
        id,
        type: 'token',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id,
        color: typeof raw.color === 'string' ? raw.color : '#ffb300',
        shape: 'circle',
      };
    }
  }

  // Associate cardIds with decks and childIds with parents/holders
  for (const [id, raw] of Object.entries(rawWidgets)) {
    if (!raw || typeof raw !== 'object') continue;
    const deckId = typeof raw.deck === 'string' ? raw.deck : (typeof raw.deckId === 'string' ? raw.deckId : undefined);
    if (deckId && normalized[deckId] && normalized[deckId].type === 'deck') {
      const d = normalized[deckId] as DeckWidget;
      if (!d.cardIds.includes(id)) {
        d.cardIds.push(id);
      }
    }

    const parentId = typeof raw.parent === 'string' ? raw.parent : undefined;
    if (parentId && normalized[parentId] && normalized[parentId].type === 'holder') {
      const h = normalized[parentId] as HolderWidget;
      if (!h.childIds.includes(id)) {
        h.childIds.push(id);
      }
      if (normalized[id] && normalized[id].x === 0 && normalized[id].y === 0) {
        normalized[id].x = h.x;
        normalized[id].y = h.y;
      }
    }
  }

  return normalized;
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
