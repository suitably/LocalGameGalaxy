/**
 * Filter functions for deciding which widgets render on the shared table canvas [ID: LOGIC-BOARD-FILTER]
 */
import type {
  TabletopWidget,
  HolderWidget,
  DeckWidget,
  CardWidget,
  TokenWidget,
  BagWidget,
} from './types';
import type { StackDeck } from './reducers/stackReducer';
import { isHandHolder, isHandHolderWidget } from './handHolder';

export { isHandHolder };

/**
 * Checks whether a card is currently stored inside a deck or a pile.
 */
export function isCardInDeck(cardId: string, widgets: Record<string, TabletopWidget>): boolean {
  for (const w of Object.values(widgets)) {
    if (w.type === 'deck') {
      const deck = w as DeckWidget;
      if (deck.cardIds?.includes(cardId)) return true;
    }
  }
  return false;
}

/**
 * Checks whether an item is stored inside a finite bag.
 */
export function isItemInBag(itemId: string, widgets: Record<string, TabletopWidget>): boolean {
  for (const w of Object.values(widgets)) {
    if (w.type === 'bag') {
      const bag = w as BagWidget;
      if (bag.itemIds?.includes(itemId)) return true;
    }
  }
  return false;
}

/**
 * Checks whether a widget is a valid snap target on the table board canvas.
 * Excludes personal player hands and supply reserve organizers since they
 * are managed in the separate player dock and are NOT part of the board canvas.
 */
export function isBoardSnapTarget(
  widget: TabletopWidget,
  draggedType?: TabletopWidget['type'],
): boolean {
  if (widget.type === 'deck') return draggedType === 'card' || !draggedType;
  if (widget.type === 'holder') {
    const holder = widget as HolderWidget;
    if (isPersonalHolder(holder)) return false;
    if (isSupplyReserveHolder(holder)) return false;
    if (draggedType && holder.dropTargetTypes && !holder.dropTargetTypes.includes(draggedType)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Finds the appropriate hand holder widget for a player/seat.
 */
export function findPlayerHandHolder(
  widgets: Record<string, TabletopWidget>,
  seatIdx?: number,
): HolderWidget | undefined {
  const hasSeat = typeof seatIdx === 'number';
  const seatPrefix = hasSeat ? `player ${seatIdx}` : '';
  const hands = Object.values(widgets).filter(
    (w): w is HolderWidget => w.type === 'holder' && isHandHolder(w as HolderWidget),
  );
  // An exact owner match wins, so seat 1 does not get the hand of owner 0 by object order.
  return (
    (hasSeat
      ? hands.find((w) => w.ownerSeat === seatIdx) ||
        hands.find((w) => w.id.toLowerCase().includes(seatPrefix) || w.ownerSeat === seatIdx - 1)
      : undefined) || hands[0]
  );
}

/**
 * Seat-owned public area (e.g. a tableau): has an owner or is named "player area" /
 * "Spielerbereich", but is not a hand and not a supply reserve. Not fanned, not in the hand dock.
 */
export function isSeatArea(holder: HolderWidget): boolean {
  if (isHandHolder(holder) || isSupplyReserveHolder(holder)) return false;
  if (typeof holder.ownerSeat === 'number') return true;
  const idLower = (holder.id || '').toLowerCase();
  const labelLower = (holder.label || '').toLowerCase();
  return ['player area', 'spielerbereich'].some(
    (name) => idLower.includes(name) || labelLower.includes(name),
  );
}

/** Hands and seat areas: personal holders that are kept off the shared table canvas. */
export function isPersonalHolder(holder: HolderWidget): boolean {
  return isHandHolder(holder) || isSeatArea(holder);
}

/**
 * Checks whether a holder is an internal player supply reserve organizer
 * (e.g. "Player 1 - Roads", "Player 2 - Settlements", "Player 1 - Cities", etc.)
 */
export function isSupplyReserveHolder(holder: HolderWidget): boolean {
  const idLower = (holder.id || '').toLowerCase();
  if (/player \d+/i.test(idLower)) {
    return (
      idLower.includes('road') ||
      idLower.includes('settlement') ||
      idLower.includes('city') ||
      idLower.includes('ship') ||
      idLower.includes('bonus') ||
      idLower.includes('reserve') ||
      idLower.includes('supply')
    );
  }
  return false;
}

/**
 * Checks whether a token is currently residing inside a player supply reserve holder
 * and has not yet been placed onto the board.
 */
export function isPieceInSupplyReserve(
  widget: TabletopWidget,
  widgets: Record<string, TabletopWidget>,
): boolean {
  if (widget.type !== 'token') return false;
  if (!widget.parent) return false;
  const parent = widgets[widget.parent];
  if (!parent || parent.type !== 'holder') return false;
  return isSupplyReserveHolder(parent as HolderWidget);
}

/**
 * Finds the matching supply reserve holder for a returned token widget.
 */
export function findMatchingSupplyHolder(
  draggedWidget: TokenWidget,
  widgets: Record<string, TabletopWidget>,
  seatIdx?: number,
): HolderWidget | undefined {
  const supplyId = draggedWidget.supplyHolderId;
  if (supplyId && widgets[supplyId]?.type === 'holder') {
    return widgets[supplyId] as HolderWidget;
  }
  const hasSeat = typeof seatIdx === 'number';
  const seatPrefix = hasSeat ? `player ${seatIdx}` : '';
  const matchTokenLabel = (w: HolderWidget, requireSeat: boolean) => {
    const hId = w.id.toLowerCase();
    if (
      requireSeat &&
      hasSeat &&
      !hId.includes(seatPrefix) &&
      w.ownerSeat !== seatIdx &&
      w.ownerSeat !== seatIdx - 1
    ) {
      return false;
    }
    const wLabel = (draggedWidget.label || draggedWidget.id).toLowerCase();
    const matches = ['road', 'settlement', 'city', 'ship'].some(
      (k) => wLabel.includes(k) && hId.includes(k),
    );
    return matches || isSupplyReserveHolder(w);
  };
  return (
    Object.values(widgets).find(
      (w): w is HolderWidget => w.type === 'holder' && matchTokenLabel(w, true),
    ) ||
    Object.values(widgets).find(
      (w): w is HolderWidget => w.type === 'holder' && matchTokenLabel(w, false),
    )
  );
}

/**
 * Returns holders that should be rendered as background zones on the table canvas.
 * Filters out personal hand areas and supply organizers when running with dock/local mode.
 */
export function filterBoardHolders(
  widgets: Record<string, TabletopWidget>,
  visibleIds: Set<string>,
  isTvMode = false,
): HolderWidget[] {
  return Object.values(widgets)
    .filter((w): w is HolderWidget => w.type === 'holder' && visibleIds.has(w.id))
    .filter((h) => {
      if (isTvMode) return true;
      if (isPersonalHolder(h)) return false;
      if (isSupplyReserveHolder(h)) return false;
      return true;
    });
}

/** Ids stored in a deck, a hand holder or a bag, collected in one pass over the widgets. */
export interface MembershipSets {
  inDeck: Set<string>;
  inHand: Set<string>;
  inBag: Set<string>;
}

/**
 * Builds the in-deck / in-hand / in-bag sets once per widget map (#684): checking each widget
 * with `isCardInDeck` / `isCardInHand` / `isItemInBag` scanned every widget again (O(n²)).
 */
export function buildMembershipSets(widgets: Record<string, TabletopWidget>): MembershipSets {
  const sets: MembershipSets = { inDeck: new Set(), inHand: new Set(), inBag: new Set() };
  const addAll = (target: Set<string>, ids: string[] | undefined) => {
    if (Array.isArray(ids)) for (const id of ids) target.add(id);
  };
  for (const w of Object.values(widgets)) {
    if (w.type === 'deck') addAll(sets.inDeck, (w as DeckWidget).cardIds);
    else if (w.type === 'bag') addAll(sets.inBag, (w as BagWidget).itemIds);
    else if (isHandHolderWidget(w)) addAll(sets.inHand, (w as HolderWidget).childIds);
  }
  return sets;
}

/**
 * Returns non-holder widgets that should be rendered on the table canvas.
 * Filters out cards currently in hand and unplaced reserve tokens when running with dock/local mode.
 * Keeps the widget map's order: every widget view sets its CSS `z-index`, so stacking needs no
 * sort, and a sort would move the DOM node of a raised (dragged) widget, which drops the touch
 * pointer's capture mid-drag (#684).
 */
export function filterBoardWidgets(
  widgets: Record<string, TabletopWidget>,
  visibleIds: Set<string>,
  isTvMode = false,
): TabletopWidget[] {
  const { inDeck, inHand, inBag } = buildMembershipSets(widgets);
  return Object.values(widgets).filter((w) => {
    if (w.type === 'holder') return false;
    if (!visibleIds.has(w.id)) return false;
    if (w.type === 'card') {
      const card = w as CardWidget;
      if (card.inPile || inDeck.has(w.id)) return false;
      if (!isTvMode && inHand.has(w.id)) return false;
    }
    if (!isTvMode && w.type === 'token' && isPieceInSupplyReserve(w, widgets)) return false;
    if (inBag.has(w.id)) return false;
    return true;
  });
}

/** Snap target (deck or board holder) under the centre of a widget at x/y, if any. */
export function findSnapTargetAt(
  widgets: Record<string, TabletopWidget>,
  x: number,
  y: number,
  width: number,
  height: number,
  draggedType?: TabletopWidget['type'],
): string | null {
  const cx = x + width / 2;
  const cy = y + height / 2;
  for (const [id, w] of Object.entries(widgets)) {
    if (!isBoardSnapTarget(w, draggedType)) continue;
    if (cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height) return id;
  }
  return null;
}

/** A card that is not in a deck or pile. */
export function isLooseCard(widget: TabletopWidget | undefined): widget is CardWidget {
  return widget?.type === 'card' && !(widget as CardWidget).inPile;
}

/** Loose card on the table under the centre of a card at x/y (the one a drop stacks onto), if any. */
export function findStackTargetAt(
  widgets: Record<string, TabletopWidget>,
  dragId: string,
  x: number,
  y: number,
  width: number,
  height: number,
): string | null {
  if (!isLooseCard(widgets[dragId])) return null;
  const inHolder = new Set<string>();
  for (const w of Object.values(widgets)) {
    if (w.type === 'holder') for (const id of (w as HolderWidget).childIds ?? []) inHolder.add(id);
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  let best: TabletopWidget | null = null;
  for (const [id, w] of Object.entries(widgets)) {
    if (id === dragId || !isLooseCard(w) || inHolder.has(id)) continue;
    if (cx < w.x || cx > w.x + w.width || cy < w.y || cy > w.y + w.height) continue;
    if (!best || w.zIndex >= best.zIndex) best = w;
  }
  return best?.id ?? null;
}

/** Most cards a fanned stack draws (the top ones; the rest only count). */
export const FAN_MAX_CARDS = 8;

/** A deck as the board draws it: a fanned stack also carries its top cards (never stored). */
export type BoardDeck = StackDeck & { fanCards?: CardWidget[] };

/** Adds the top cards to every fanned stack of `list` so its view can show what lies underneath. */
export function withFanCards(
  list: TabletopWidget[],
  all: Record<string, TabletopWidget>,
): TabletopWidget[] {
  return list.map((w) => {
    const deck = w as StackDeck;
    if (w.type !== 'deck' || !deck.isPile || deck.stackDisplay !== 'fan') return w;
    const fanCards = deck.cardIds
      .slice(-FAN_MAX_CARDS)
      .map((id) => all[id])
      .filter((c): c is CardWidget => c?.type === 'card');
    return { ...deck, fanCards } as BoardDeck;
  });
}
