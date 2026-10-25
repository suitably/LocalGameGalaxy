/**
 * Deck and bag presses for the table engine [ID: HOOK-TABLETOP-SOURCE-PRESS]
 *
 * Tap: a deck deals its top card into the viewer's hand, a bag places an item next to it.
 * Drag: the top card (face down unless the pile is open) or a bag item leaves the source and
 * follows the pointer. Long press: the engine moves the source itself instead.
 */
import type { BagWidget, DeckWidget, TabletopWidget } from '../logic/types';
import { deckShowsFront, nextSourceItemId, type SourceKind } from '../logic/tableGestures';

export interface SourceCallbacks {
  widgets: Record<string, TabletopWidget>;
  handHolderId?: string;
  onSnapToHolder: (widgetId: string, holderId: string) => void;
  onDrawCardAt?: (deckId: string, x: number, y: number, cardId?: string, faceUp?: boolean) => void;
  onDrawFromBag?: (bagId: string, position?: { x: number; y: number }, spawnedId?: string) => void;
}

export interface SourcePress {
  id: string;
  kind: SourceKind;
  longPressed: boolean;
  /** An item was dealt off the source; the drag follows that item now. */
  dealt: boolean;
}

/** Deals the item a drag takes off the source at the source's position; returns its id. */
export function dealFromSource(cb: SourceCallbacks, source: TabletopWidget): string | null {
  const itemId = nextSourceItemId(source);
  if (!itemId) return null;
  if (source.type === 'deck') {
    const deck = source as DeckWidget;
    cb.onDrawCardAt?.(deck.id, deck.x, deck.y, itemId, deckShowsFront(deck));
  } else {
    const bag = source as BagWidget;
    cb.onDrawFromBag?.(bag.id, { x: bag.x, y: bag.y }, itemId);
  }
  return itemId;
}

/** Tap on a source: top card into the hand, or a bag item next to the bag. */
export function tapSource(cb: SourceCallbacks, source: TabletopWidget) {
  if (source.type === 'bag') {
    cb.onDrawFromBag?.(source.id);
    return;
  }
  const hand = cb.handHolderId ? cb.widgets[cb.handHolderId] : undefined;
  if (!hand) return;
  const cardId = nextSourceItemId(source);
  if (!cardId) return;
  cb.onDrawCardAt?.(source.id, source.x, source.y, cardId);
  cb.onSnapToHolder(cardId, hand.id);
}
