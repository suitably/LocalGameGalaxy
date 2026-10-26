/**
 * Tabletop Game Validator & Sanitizer [ID: GAME-TABLETOP-VALIDATOR]
 */
import {
  HEX_CLIP_PATH,
  type TabletopGameDefinition,
  type TabletopWidget,
  type TabletopPlayMode,
  type TabletopTableConfig,
  type HolderWidget,
  type CardWidget,
  type DeckWidget,
  type HiddenZone,
} from './types';
import { isPersonalHolder, isSupplyReserveHolder } from './boardFilter';

export type RawTabletopGameInput =
  | TabletopGameDefinition
  | (Partial<Omit<TabletopGameDefinition, 'widgets' | 'table' | 'version'>> & {
      version?: string | number;
      widgets?: Record<string, Partial<TabletopWidget> | Record<string, unknown>>;
      table?: Partial<TabletopTableConfig>;
      [key: string]: unknown;
    });

export function sanitizeGameSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `game-${Date.now()}`;
}

export function sanitizeLegacyUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(
      /^https?:\/\/cloud-\d+\.steamusercontent\.com\//i,
      'https://steamusercontent-a.akamaihd.net/',
    )
    .replace(
      /^http:\/\/steamusercontent-a\.akamaihd\.net\//i,
      'https://steamusercontent-a.akamaihd.net/',
    )
    .replace(
      /^http:\/\/steamuserimages-a\.akamaihd\.net\//i,
      'https://steamuserimages-a.akamaihd.net/',
    );
}

export function validateAndSanitizeGame(raw: RawTabletopGameInput): TabletopGameDefinition {
  const name = (raw.name || 'Unbenanntes Spiel').trim();
  const id = (raw.id || sanitizeGameSlug(name)).trim();

  const minPlayers = Math.max(1, typeof raw.minPlayers === 'number' ? raw.minPlayers : 1);
  const maxPlayers = Math.max(minPlayers, typeof raw.maxPlayers === 'number' ? raw.maxPlayers : 6);

  const rawWidgets = raw.widgets && typeof raw.widgets === 'object' ? raw.widgets : {};
  const cleanWidgets: Record<string, TabletopWidget> = {};

  let hasHands = false;

  for (const [wId, w] of Object.entries(rawWidgets)) {
    if (!w || typeof w !== 'object') continue;
    const wObj = w as Record<string, unknown>;
    const widgetId = String(wObj.id || wId).trim();
    if (!widgetId) continue;

    const base = {
      id: widgetId,
      type: w.type || 'card',
      x: typeof w.x === 'number' ? w.x : 0,
      y: typeof w.y === 'number' ? w.y : 0,
      width: typeof w.width === 'number' && w.width > 0 ? w.width : 80,
      height: typeof w.height === 'number' && w.height > 0 ? w.height : 120,
      zIndex: typeof w.zIndex === 'number' ? w.zIndex : 1,
      ownerSeat: typeof w.ownerSeat === 'number' ? w.ownerSeat : undefined,
      pinned: Boolean(w.pinned),
      label: typeof w.label === 'string' ? w.label : undefined,
    };

    if (w.type === 'holder') {
      const holderWidget = { id: widgetId, ...w } as HolderWidget;
      if (isPersonalHolder(holderWidget)) {
        hasHands = true;
      }
      if (isPersonalHolder(holderWidget) || isSupplyReserveHolder(holderWidget)) {
        base.x = -99999;
        base.y = -99999;
      }
    }

    if (w.type === 'deck') {
      let deckFaceUp = false;
      if (w.faceUp !== undefined) {
        deckFaceUp = Boolean(w.faceUp);
      } else if (w.activeFace !== undefined) {
        deckFaceUp = Number(w.activeFace) > 0;
      }
      (base as Record<string, unknown>).faceUp = deckFaceUp;
      (base as Record<string, unknown>).activeFace = deckFaceUp ? 1 : 0;
    }

    const widgetCopy = { ...w, ...base } as Record<string, unknown>;
    if (typeof widgetCopy.image === 'string') {
      widgetCopy.image = sanitizeLegacyUrl(widgetCopy.image);
    }
    if (
      widgetCopy.type === 'card' &&
      widgetCopy.frontContent &&
      typeof widgetCopy.frontContent === 'object'
    ) {
      const fc = widgetCopy.frontContent as Record<string, unknown>;
      if (typeof fc.value === 'string') fc.value = sanitizeLegacyUrl(fc.value);
      if (fc.spriteSheet && typeof fc.spriteSheet === 'object') {
        const ss = fc.spriteSheet as Record<string, unknown>;
        if (typeof ss.url === 'string') ss.url = sanitizeLegacyUrl(ss.url);
      }
    }
    if (
      widgetCopy.type === 'card' &&
      widgetCopy.backContent &&
      typeof widgetCopy.backContent === 'object'
    ) {
      const bc = widgetCopy.backContent as Record<string, unknown>;
      if (typeof bc.value === 'string') bc.value = sanitizeLegacyUrl(bc.value);
      if (bc.spriteSheet && typeof bc.spriteSheet === 'object') {
        const ss = bc.spriteSheet as Record<string, unknown>;
        if (typeof ss.url === 'string') ss.url = sanitizeLegacyUrl(ss.url);
      }
    }
    if (
      widgetCopy.type === 'deck' &&
      widgetCopy.backContent &&
      typeof widgetCopy.backContent === 'object'
    ) {
      const bc = widgetCopy.backContent as Record<string, unknown>;
      if (typeof bc.value === 'string') bc.value = sanitizeLegacyUrl(bc.value);
    }

    // Suppress raw generic names from tokens
    if (widgetCopy.type === 'token' && typeof widgetCopy.label === 'string') {
      if (
        widgetCopy.label.startsWith('backgammon_piece') ||
        widgetCopy.label.startsWith('PiecePack')
      ) {
        widgetCopy.label = undefined;
      }
    }

    // Normalization for hex cards/decks
    const isHexCardOrDeck =
      (widgetCopy.type === 'card' || widgetCopy.type === 'deck') &&
      (widgetCopy.clipPath === HEX_CLIP_PATH ||
        (widgetCopy.width === 210 && widgetCopy.height === 182));

    if (isHexCardOrDeck) {
      widgetCopy.width = 210;
      widgetCopy.height = 182;
      widgetCopy.clipPath = HEX_CLIP_PATH;
    }

    cleanWidgets[widgetId] = widgetCopy as unknown as TabletopWidget;
  }

  // Pass 2: a deck that contains hex cards is hex-shaped too, and so are all its cards
  for (const w of Object.values(cleanWidgets)) {
    if (w.type === 'deck') {
      const deck = w as DeckWidget;
      const containsHexCards = deck.cardIds?.some((cId) => {
        const c = cleanWidgets[cId] as CardWidget | undefined;
        return c && (c.clipPath === HEX_CLIP_PATH || c.width === 210);
      });

      if (containsHexCards) {
        deck.width = 210;
        deck.height = 182;
        deck.clipPath = HEX_CLIP_PATH;
        for (const cId of deck.cardIds) {
          const childCard = cleanWidgets[cId] as CardWidget | undefined;
          if (childCard) {
            childCard.width = 210;
            childCard.height = 182;
            childCard.clipPath = HEX_CLIP_PATH;
          }
        }
      }
    }
  }

  // Pass 3: a card that belongs to a hex deck is hex-shaped too
  for (const w of Object.values(cleanWidgets)) {
    if (w.type === 'card') {
      const card = w as CardWidget;
      if (card.deckId && cleanWidgets[card.deckId]?.clipPath === HEX_CLIP_PATH) {
        card.width = 210;
        card.height = 182;
        card.clipPath = HEX_CLIP_PATH;
      }
    }
  }

  // Determine default supportedModes if not supplied
  const supportedModes: TabletopPlayMode[] = Array.isArray(raw.supportedModes)
    ? [...raw.supportedModes]
    : [];
  if (supportedModes.length === 0) {
    if (hasHands || maxPlayers > 1) {
      supportedModes.push('party_multi_device');
    }
    if (minPlayers === 1) {
      supportedModes.push('solo');
    }
    supportedModes.push('local_pass_and_play');
  }

  const rawBg =
    raw.table?.backgroundImageUrl ||
    ((raw.table as Record<string, unknown> | undefined)?.background as string | undefined);

  const rawHiddenZones =
    raw.hiddenZones && typeof raw.hiddenZones === 'object' ? raw.hiddenZones : {};
  const cleanHiddenZones: Record<string, HiddenZone> = {};
  for (const [zId, z] of Object.entries(rawHiddenZones)) {
    if (!z || typeof z !== 'object') continue;
    const zoneObj = z as Partial<HiddenZone>;
    cleanHiddenZones[zId] = {
      id: zoneObj.id || zId,
      x: typeof zoneObj.x === 'number' ? zoneObj.x : 0,
      y: typeof zoneObj.y === 'number' ? zoneObj.y : 0,
      width: typeof zoneObj.width === 'number' ? zoneObj.width : 300,
      height: typeof zoneObj.height === 'number' ? zoneObj.height : 200,
      color: typeof zoneObj.color === 'string' ? zoneObj.color : undefined,
      ownerSeat: typeof zoneObj.ownerSeat === 'number' ? zoneObj.ownerSeat : undefined,
      revealed: Boolean(zoneObj.revealed),
      label: typeof zoneObj.label === 'string' ? zoneObj.label : undefined,
    };
  }

  return {
    id,
    name,
    description: raw.description?.trim() || '',
    author: raw.author?.trim() || 'Community',
    version:
      typeof raw.version === 'string'
        ? raw.version.trim() || '1.0.0'
        : typeof raw.version === 'number'
          ? String(raw.version)
          : '1.0.0',
    minPlayers,
    maxPlayers,
    supportedModes,
    table: {
      width: raw.table?.width && raw.table.width > 200 ? raw.table.width : 1600,
      height: raw.table?.height && raw.table.height > 200 ? raw.table.height : 1000,
      backgroundColor: raw.table?.backgroundColor || '#1e3d2f', // Classic green felt
      backgroundImageUrl: sanitizeLegacyUrl(rawBg) || undefined,
      gridSnap: raw.table?.gridSnap && raw.table.gridSnap > 0 ? raw.table.gridSnap : 20,
    },
    widgets: cleanWidgets,
    assetFiles: raw.assetFiles || {},
    updatedAt: raw.updatedAt || Date.now(),
    ruleText: typeof raw.ruleText === 'string' ? raw.ruleText : undefined,
    hiddenZones: Object.keys(cleanHiddenZones).length > 0 ? cleanHiddenZones : undefined,
  };
}
