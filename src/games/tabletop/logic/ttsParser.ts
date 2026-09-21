/**
 * Tabletop Simulator (TTS) Save File Parser [ID: GAME-TABLETOP-TTS-PARSER]
 *
 * Converts TTS save file JSON (3D ObjectStates) into the Galaxy
 * TabletopGameDefinition (2D widget-based) format.
 */
import type { TTSSaveFile, TTSObjectState, TTSCustomDeckEntry } from './ttsTypes';
import type {
  TabletopGameDefinition,
  TabletopWidget,
  CardWidget,
  DeckWidget,
  DieWidget,
  TokenWidget,
  HolderWidget,
  CardContent,
} from './types';
import { validateAndSanitizeGame } from './gameValidator';
import { resolveCardSprite, resolveBackSprite } from './ttsSpritesheet';

/** Scale factor: 1 TTS unit ≈ this many pixels */
const TTS_SCALE = 50;
/** Default card dimensions in pixels */
const CARD_W = 80;
const CARD_H = 120;
/** Token/figurine default size */
const TOKEN_SIZE = 40;
/** Die default size */
const DIE_SIZE = 54;

// ─── Detection ───────────────────────────────────────────────────────

/**
 * Returns true if the parsed JSON looks like a TTS save file.
 */
export function isTtsSaveFile(json: unknown): json is TTSSaveFile {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;
  const obj = json as Record<string, unknown>;
  return typeof obj.SaveName === 'string' && Array.isArray(obj.ObjectStates);
}

// ─── Color Helpers ───────────────────────────────────────────────────

function ttsColorToHex(c?: { r: number; g: number; b: number }): string {
  if (!c) return '#ffffff';
  const r = Math.round(Math.min(1, Math.max(0, c.r)) * 255);
  const g = Math.round(Math.min(1, Math.max(0, c.g)) * 255);
  const b = Math.round(Math.min(1, Math.max(0, c.b)) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── HandTrigger seat mapping by FogColor ────────────────────────────

const FOG_COLOR_SEAT: Record<string, number> = {
  White: 0, Brown: 1, Red: 2, Orange: 3,
  Yellow: 4, Green: 5, Teal: 6, Blue: 7,
  Purple: 8, Pink: 9, Black: 10,
};

// ─── Die name → sides ────────────────────────────────────────────────

function parseDieSides(name: string): number | null {
  const match = name.match(/^Die_(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

// ─── 3D → 2D coordinate projection ──────────────────────────────────

interface BoundingBox {
  minX: number; maxX: number;
  minZ: number; maxZ: number;
}

function computeBounds(objects: TTSObjectState[]): BoundingBox {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const obj of objects) {
    const { posX, posZ } = obj.Transform;
    if (posX < minX) minX = posX;
    if (posX > maxX) maxX = posX;
    if (posZ < minZ) minZ = posZ;
    if (posZ > maxZ) maxZ = posZ;
  }

  // Fallback for single-object or empty scenes
  if (!isFinite(minX)) { minX = 0; maxX = 10; }
  if (!isFinite(minZ)) { minZ = 0; maxZ = 10; }

  return { minX, maxX, minZ, maxZ };
}

function projectPosition(
  obj: TTSObjectState,
  bounds: BoundingBox,
  margin: number,
): { x: number; y: number; zIndex: number } {
  const x = (obj.Transform.posX - bounds.minX) * TTS_SCALE + margin;
  const y = (obj.Transform.posZ - bounds.minZ) * TTS_SCALE + margin;
  // posY (height) → zIndex — higher objects are on top
  const zIndex = Math.round(obj.Transform.posY * 100);
  return { x: Math.round(x), y: Math.round(y), zIndex: Math.max(1, zIndex) };
}

// ─── Card sprite content builder ─────────────────────────────────────

function buildCardFrontContent(
  cardId: number,
  customDecks: Record<string, TTSCustomDeckEntry>,
): CardContent {
  const sprite = resolveCardSprite(cardId, customDecks);
  if (!sprite) return { type: 'text', value: '🂠' };
  return {
    type: 'image',
    value: sprite.url,
    spriteSheet: {
      url: sprite.url,
      col: sprite.col,
      row: sprite.row,
      numWidth: sprite.numWidth,
      numHeight: sprite.numHeight,
    },
  };
}

function buildCardBackContent(
  cardId: number,
  customDecks: Record<string, TTSCustomDeckEntry>,
): CardContent {
  // Try UniqueBack first
  const backSprite = resolveBackSprite(cardId, customDecks);
  if (backSprite) {
    return {
      type: 'image',
      value: backSprite.url,
      spriteSheet: {
        url: backSprite.url,
        col: backSprite.col,
        row: backSprite.row,
        numWidth: backSprite.numWidth,
        numHeight: backSprite.numHeight,
      },
    };
  }
  // Shared back
  const deckIndex = Math.floor(cardId / 100);
  const deck = customDecks[String(deckIndex)];
  if (deck?.BackURL) {
    return { type: 'image', value: deck.BackURL };
  }
  return { type: 'text', value: '🂠', color: '#1565c0' };
}

// ─── Object Converters ───────────────────────────────────────────────

let widgetIdCounter = 0;

function nextId(prefix: string): string {
  return `${prefix}_${++widgetIdCounter}`;
}

function convertCard(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  allCustomDecks: Record<string, TTSCustomDeckEntry>,
  deckWidgetId?: string,
): CardWidget {
  const cardId = obj.CardID ?? 0;
  const decks = { ...allCustomDecks, ...(obj.CustomDeck || {}) };

  return {
    id: obj.GUID,
    type: 'card',
    x: pos.x, y: pos.y,
    width: CARD_W, height: CARD_H,
    zIndex: pos.zIndex,
    label: obj.Nickname || `Karte ${cardId}`,
    deckId: deckWidgetId,
    frontContent: buildCardFrontContent(cardId, decks),
    backContent: buildCardBackContent(cardId, decks),
    faceUp: !obj.HideWhenFaceDown,
    rotation: 0,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

function convertDeck(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  allCustomDecks: Record<string, TTSCustomDeckEntry>,
  widgets: Record<string, TabletopWidget>,
): DeckWidget {
  const deckId = nextId('deck');
  const mergedDecks = { ...allCustomDecks, ...(obj.CustomDeck || {}) };
  const cardIds: string[] = [];

  // Create cards from ContainedObjects
  if (obj.ContainedObjects && obj.ContainedObjects.length > 0) {
    for (const child of obj.ContainedObjects) {
      const card = convertCard(child, { x: pos.x, y: pos.y, zIndex: pos.zIndex + 1 }, mergedDecks, deckId);
      card.inPile = true;
      card.pileId = deckId;
      card.faceUp = false;
      widgets[card.id] = card;
      cardIds.push(card.id);
    }
  } else if (obj.DeckIDs) {
    // Create cards from DeckIDs (no ContainedObjects)
    for (const dId of obj.DeckIDs) {
      const cId = nextId('card');
      const card: CardWidget = {
        id: cId,
        type: 'card',
        x: pos.x, y: pos.y,
        width: CARD_W, height: CARD_H,
        zIndex: pos.zIndex + 1,
        label: `Karte ${dId}`,
        deckId,
        frontContent: buildCardFrontContent(dId, mergedDecks),
        backContent: buildCardBackContent(dId, mergedDecks),
        faceUp: false,
        rotation: 0,
        inPile: true,
        pileId: deckId,
        movable: true,
        pinned: false,
      };
      widgets[cId] = card;
      cardIds.push(cId);
    }
  }

  // Get back image from first CustomDeck entry
  const firstDeckKey = Object.keys(mergedDecks)[0];
  const firstDeck = firstDeckKey ? mergedDecks[firstDeckKey] : undefined;
  const backContent: CardContent = firstDeck?.BackURL
    ? { type: 'image', value: firstDeck.BackURL }
    : { type: 'text', value: '🂠', color: '#1565c0' };

  return {
    id: deckId,
    type: 'deck',
    x: pos.x, y: pos.y,
    width: CARD_W, height: CARD_H,
    zIndex: pos.zIndex,
    label: obj.Nickname || 'Kartenstapel',
    cardIds,
    backContent,
    isPile: true,
    cardCount: cardIds.length,
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

function convertDie(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  sides: number,
): DieWidget {
  return {
    id: obj.GUID,
    type: 'die',
    x: pos.x, y: pos.y,
    width: DIE_SIZE, height: DIE_SIZE,
    zIndex: pos.zIndex,
    label: obj.Nickname || `W${sides}`,
    currentValue: typeof obj.Value === 'number' ? obj.Value : 1,
    sides,
    color: ttsColorToHex(obj.ColorDiffuse),
    pipColor: '#222222',
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

function convertToken(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
): TokenWidget {
  const imageUrl = obj.CustomImage?.ImageURL || undefined;
  const scale = Math.max(obj.Transform.scaleX || 1, obj.Transform.scaleZ || 1);
  const size = Math.round(TOKEN_SIZE * Math.min(scale, 3));

  return {
    id: obj.GUID,
    type: 'token',
    x: pos.x, y: pos.y,
    width: size, height: size,
    zIndex: pos.zIndex,
    label: obj.Nickname || obj.Name,
    color: ttsColorToHex(obj.ColorDiffuse),
    image: imageUrl,
    shape: 'circle',
    movable: !obj.Locked,
    pinned: Boolean(obj.Locked),
  };
}

function convertHandTrigger(
  obj: TTSObjectState,
  pos: { x: number; y: number; zIndex: number },
  seatIndex: number,
): HolderWidget {
  return {
    id: obj.GUID,
    type: 'holder',
    x: pos.x, y: pos.y,
    width: 240, height: 140,
    zIndex: pos.zIndex + 1000,
    label: `Hand ${seatIndex + 1}`,
    dropTargetTypes: ['card'],
    childIds: [],
    layout: 'fan',
    isHand: true,
    ownerSeat: seatIndex,
    movable: false,
    pinned: true,
  };
}

// ─── Main Parser ─────────────────────────────────────────────────────

export interface TtsParserOptions {
  defaultName?: string;
}

/**
 * Parses a TTS save file into a TabletopGameDefinition.
 */
export function parseTtsSaveFile(
  save: TTSSaveFile,
  options?: TtsParserOptions,
): TabletopGameDefinition {
  // Reset counter
  widgetIdCounter = 0;

  const widgets: Record<string, TabletopWidget> = {};
  const bounds = computeBounds(save.ObjectStates);
  const margin = 80;

  // Collect all CustomDeck entries globally
  const globalDecks: Record<string, TTSCustomDeckEntry> = {};
  collectCustomDecks(save.ObjectStates, globalDecks);

  // Track HandTrigger seat assignment
  let handSeatCounter = 0;

  // Find the board image (Custom_Board or large Custom_Model)
  let boardImageUrl: string | undefined;
  for (const obj of save.ObjectStates) {
    if (obj.Name === 'Custom_Board' && obj.CustomImage?.ImageURL) {
      boardImageUrl = obj.CustomImage.ImageURL;
      break;
    }
  }

  // Process all top-level objects
  for (const obj of save.ObjectStates) {
    const pos = projectPosition(obj, bounds, margin);
    const name = obj.Name;

    // Skip meta-only objects
    if (name === 'Custom_Assetbundle' || name === 'Custom_PDF') continue;

    // HandTrigger → player hand
    if (name === 'HandTrigger') {
      const seat = obj.FogColor && FOG_COLOR_SEAT[obj.FogColor] !== undefined
        ? FOG_COLOR_SEAT[obj.FogColor]
        : handSeatCounter;
      handSeatCounter = Math.max(handSeatCounter, seat + 1);
      const hand = convertHandTrigger(obj, pos, seat);
      widgets[hand.id] = hand;
      continue;
    }

    // Dice
    const dieSides = parseDieSides(name);
    if (dieSides !== null) {
      widgets[obj.GUID] = convertDie(obj, pos, dieSides);
      continue;
    }

    // Deck / DeckCustom
    if (name === 'Deck' || name === 'DeckCustom') {
      const deck = convertDeck(obj, pos, globalDecks, widgets);
      widgets[deck.id] = deck;
      continue;
    }

    // Single Card (not inside a deck)
    if (name === 'Card') {
      widgets[obj.GUID] = convertCard(obj, pos, globalDecks);
      continue;
    }

    // Infinite_Bag / Bag → DeckWidget (supply pile)
    if (name === 'Infinite_Bag' || name === 'Bag') {
      const bagId = nextId('bag');
      const childIds: string[] = [];
      if (obj.ContainedObjects) {
        for (const child of obj.ContainedObjects) {
          const tok = convertToken(child, { x: pos.x, y: pos.y, zIndex: pos.zIndex + 1 });
          tok.movable = true;
          tok.pinned = false;
          widgets[tok.id] = tok;
          childIds.push(tok.id);
        }
      }
      widgets[bagId] = {
        id: bagId,
        type: 'deck',
        x: pos.x, y: pos.y,
        width: 60, height: 60,
        zIndex: pos.zIndex,
        label: obj.Nickname || 'Vorrat',
        cardIds: childIds,
        backContent: { type: 'text', value: '🎒', color: ttsColorToHex(obj.ColorDiffuse) },
        movable: !obj.Locked,
        pinned: Boolean(obj.Locked),
      } as DeckWidget;
      continue;
    }

    // Custom_Board → skip if used as background, otherwise token
    if (name === 'Custom_Board') {
      if (obj.CustomImage?.ImageURL === boardImageUrl) continue;
      widgets[obj.GUID] = convertToken(obj, pos);
      continue;
    }

    // Custom_Model → ignore (3D meshes can't be rendered in 2D)
    if (name === 'Custom_Model') continue;

    // Figurine_Custom, Custom_Token, backgammon_piece_*, PiecePack_* → Token
    if (
      name === 'Figurine_Custom' ||
      name === 'Custom_Token' ||
      name.startsWith('backgammon_piece') ||
      name.startsWith('PiecePack_')
    ) {
      widgets[obj.GUID] = convertToken(obj, pos);
      continue;
    }

    // Default fallback: generic token for any unrecognized object
    if (!name.startsWith('Notecard') && !name.startsWith('Tablet')) {
      widgets[obj.GUID] = convertToken(obj, pos);
    }
  }

  // Calculate table dimensions from projected bounds
  const tableWidth = Math.round((bounds.maxX - bounds.minX) * TTS_SCALE + margin * 2 + 200);
  const tableHeight = Math.round((bounds.maxZ - bounds.minZ) * TTS_SCALE + margin * 2 + 200);

  // Extract rules from TabStates
  let ruleText: string | undefined;
  if (save.TabStates) {
    const rulesTab = Object.values(save.TabStates).find((t) => t.title === 'Rules');
    if (rulesTab?.body) ruleText = rulesTab.body;
  }

  return validateAndSanitizeGame({
    name: save.SaveName || options?.defaultName || 'TTS Import',
    description: save.Note || save.Tags?.join(', ') || '',
    author: 'Steam Workshop',
    version: save.VersionNumber || '1.0.0',
    minPlayers: save.PlayerCounts?.[0] ?? 1,
    maxPlayers: save.PlayerCounts?.[1] ?? 6,
    table: {
      width: Math.max(1600, tableWidth),
      height: Math.max(1000, tableHeight),
      backgroundImageUrl: boardImageUrl,
      backgroundColor: '#1a472a',
    },
    widgets,
    ruleText,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Recursively collects all CustomDeck entries from the object tree */
function collectCustomDecks(
  objects: TTSObjectState[],
  out: Record<string, TTSCustomDeckEntry>,
): void {
  for (const obj of objects) {
    if (obj.CustomDeck) {
      for (const [key, deck] of Object.entries(obj.CustomDeck)) {
        if (!out[key]) out[key] = deck;
      }
    }
    if (obj.ContainedObjects) {
      collectCustomDecks(obj.ContainedObjects, out);
    }
  }
}
