/**
 * PlayingCards.io (.pcio) and Tabletop JSON Parser [ID: GAME-TABLETOP-PARSER]
 */
import { unzipSync } from 'fflate';
import type { TabletopGameDefinition, TabletopWidget, CardWidget, DeckWidget, HolderWidget } from './types';
import { validateAndSanitizeGame } from './gameValidator';

interface PcioRawState {
  version?: number | string;
  name?: string;
  description?: string;
  author?: string;
  table?: { width?: number; height?: number; background?: string };
  widgets?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

/**
 * Normalizes PlayingCards.io widget structures into Galaxy Tabletop Widgets.
 */
function normalizePcioWidgets(rawWidgets: Record<string, Record<string, unknown>>): Record<string, TabletopWidget> {
  const normalized: Record<string, TabletopWidget> = {};

  for (const [id, raw] of Object.entries(rawWidgets)) {
    const rawType = String(raw.type || '').toLowerCase();
    const x = typeof raw.x === 'number' ? raw.x : 0;
    const y = typeof raw.y === 'number' ? raw.y : 0;
    const width = typeof raw.width === 'number' ? raw.width : 80;
    const height = typeof raw.height === 'number' ? raw.height : 120;
    const zIndex = typeof raw.zIndex === 'number' ? raw.zIndex : 1;
    const label = typeof raw.label === 'string' ? raw.label : undefined;

    if (rawType.includes('deck') || rawType === 'carddeck') {
      const cardIds = Array.isArray(raw.cardIds) ? (raw.cardIds as string[]) : [];
      const deck: DeckWidget = {
        id,
        type: 'deck',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || 'Ziehstapel',
        cardIds,
        backContent: { type: 'text', value: '🂠', color: '#1565c0' },
      };
      normalized[id] = deck;
    } else if (rawType.includes('hand') || rawType === 'cardhand') {
      const seat = typeof raw.seat === 'number' ? raw.seat : (typeof raw.player === 'number' ? raw.player : 0);
      const holder: HolderWidget = {
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
      };
      normalized[id] = holder;
    } else if (rawType.includes('holder') || rawType === 'zone' || rawType.includes('pile')) {
      const holder: HolderWidget = {
        id,
        type: 'holder',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || 'Ablage',
        dropTargetTypes: ['card', 'token'],
        childIds: Array.isArray(raw.childIds) ? (raw.childIds as string[]) : [],
        layout: 'stack',
        dropTarget: true,
      };
      normalized[id] = holder;
    } else if (rawType.includes('card')) {
      const card: CardWidget = {
        id,
        type: 'card',
        x,
        y,
        width,
        height,
        zIndex,
        label,
        deckId: typeof raw.deckId === 'string' ? raw.deckId : undefined,
        frontContent: {
          type: typeof raw.frontImage === 'string' ? 'image' : 'text',
          value: String(raw.frontImage || raw.value || raw.label || 'Karte'),
        },
        backContent: {
          type: typeof raw.backImage === 'string' ? 'image' : 'text',
          value: String(raw.backImage || '🂠'),
          color: '#1565c0',
        },
        faceUp: raw.faceUp !== false,
        rotation: typeof raw.rotation === 'number' ? raw.rotation : 0,
      };
      normalized[id] = card;
    } else {
      // Generic token or counter
      normalized[id] = {
        id,
        type: 'token',
        x,
        y,
        width,
        height,
        zIndex,
        label: label || id,
        color: '#ffb300',
        shape: 'circle',
      };
    }
  }

  return normalized;
}

/**
 * Parses a `.pcio` (ZIP ArrayBuffer) or a raw JSON string into a TabletopGameDefinition.
 */
export async function parsePcioFile(source: ArrayBuffer | string): Promise<TabletopGameDefinition> {
  // Scenario 1: Source is a raw JSON string
  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source) as PcioRawState;
      const widgets = parsed.widgets ? normalizePcioWidgets(parsed.widgets) : {};
      return validateAndSanitizeGame({
        ...parsed,
        widgets: Object.keys(widgets).length > 0 ? widgets : (parsed.widgets as unknown as Record<string, TabletopWidget>),
      });
    } catch (err) {
      throw new Error(`Ungültige Tabletop-JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Scenario 2: Source is an ArrayBuffer (ZIP archive)
  try {
    const uint8 = new Uint8Array(source);
    const unzipped = unzipSync(uint8);

    const assetFiles: Record<string, string> = {};
    let stateJsonContent: string | null = null;

    for (const [filename, fileBytes] of Object.entries(unzipped)) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.json') && (lower.includes('template') || lower.includes('state') || lower.includes('manifest') || !stateJsonContent)) {
        stateJsonContent = new TextDecoder('utf-8').decode(fileBytes);
      } else if (/\.(png|jpg|jpeg|webp|svg)$/i.test(lower)) {
        const mime = getMimeType(filename);
        assetFiles[filename] = `data:${mime};base64,${uint8ArrayToBase64(fileBytes)}`;
      }
    }

    if (!stateJsonContent) {
      throw new Error('Keine template.json oder state.json im .pcio Archiv gefunden');
    }

    const parsedState = JSON.parse(stateJsonContent) as PcioRawState;
    const normalizedWidgets = parsedState.widgets ? normalizePcioWidgets(parsedState.widgets) : {};

    return validateAndSanitizeGame({
      ...parsedState,
      widgets: Object.keys(normalizedWidgets).length > 0 ? normalizedWidgets : undefined,
      assetFiles,
    });
  } catch (err) {
    throw new Error(`Fehler beim Entpacken der .pcio Datei: ${err instanceof Error ? err.message : String(err)}`);
  }
}
