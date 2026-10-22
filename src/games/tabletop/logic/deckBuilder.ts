/**
 * Building card decks in the editor from image URLs or a spritesheet [ID: LOGIC-TABLETOP-DECK-BUILDER]
 */
import type { CardContent, CardWidget, DeckWidget, TabletopWidget } from './types';

export const MAX_DECK_CARDS = 500;

/** What the deck builder dialog collects. */
export interface DeckDraft {
  label: string;
  backImage: string;
  width: number;
  height: number;
  faces: CardContent[];
}

export interface DeckSpec {
  deckId: string;
  x: number;
  y: number;
  zIndex: number;
  width: number;
  height: number;
  label?: string;
  backImage?: string;
  faces: CardContent[];
}

/** One card face per non-empty line. */
export function facesFromImageList(text: string): CardContent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_DECK_CARDS)
    .map((url) => ({ type: 'image', value: url }));
}

/** Faces cut from a `cols` × `rows` sheet, row by row; `count` drops trailing empty cells. */
export function facesFromSpritesheet(
  url: string,
  cols: number,
  rows: number,
  count = cols * rows,
): CardContent[] {
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  const n = Math.min(Math.max(0, Math.floor(count)), c * r, MAX_DECK_CARDS);
  return Array.from({ length: n }, (_, i) => ({
    type: 'image',
    value: url,
    spriteSheet: { url, col: i % c, row: Math.floor(i / c), numWidth: c, numHeight: r },
  }));
}

/** The deck widget followed by its face-down cards, ready for `ADD_WIDGETS`. */
export function buildDeck(spec: DeckSpec): TabletopWidget[] {
  const backContent: CardContent = spec.backImage
    ? { type: 'image', value: spec.backImage }
    : { type: 'text', value: '🂠', color: '#1565c0' };
  const cards: CardWidget[] = spec.faces.map((frontContent, i) => ({
    id: `${spec.deckId}_c${i + 1}`,
    type: 'card',
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    zIndex: spec.zIndex + 1,
    deckId: spec.deckId,
    frontContent,
    backContent,
    faceUp: false,
    rotation: 0,
    inPile: true,
    pileId: spec.deckId,
    movable: true,
  }));
  const deck: DeckWidget = {
    id: spec.deckId,
    type: 'deck',
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    zIndex: spec.zIndex,
    label: spec.label,
    cardIds: cards.map((c) => c.id),
    cardCount: cards.length,
    backContent,
    isPile: true,
    movable: true,
  };
  return [deck, ...cards];
}
