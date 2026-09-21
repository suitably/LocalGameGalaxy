/**
 * Filter functions for deciding which widgets render on the shared table canvas [ID: LOGIC-BOARD-FILTER]
 */
import type { TabletopWidget, HolderWidget, DeckWidget, CardWidget, TokenWidget } from './types';
import { isCardInHand } from './handLayout';

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
 * Checks whether a holder is a player hand holder or personal player area.
 */
export function isHandHolder(holder: HolderWidget): boolean {
  if (holder.isHand) return true;
  if (typeof holder.ownerSeat === 'number' && !isSupplyReserveHolder(holder)) return true;
  const idLower = (holder.id || '').toLowerCase();
  const labelLower = (holder.label || '').toLowerCase();
  return (
    idLower === 'hand' ||
    idLower.includes('_hand') ||
    idLower.includes('hand_') ||
    idLower.includes('- hand') ||
    idLower.endsWith('hand') ||
    labelLower.includes('hand') ||
    idLower.includes('player area') ||
    labelLower.includes('player area') ||
    idLower.includes('spielerbereich') ||
    labelLower.includes('spielerbereich') ||
    /player \d+.*hand/i.test(idLower) ||
    /spieler \d+.*hand/i.test(idLower)
  );
}

/**
 * Checks whether a widget is a valid snap target on the table board canvas.
 * Excludes personal player hands and supply reserve organizers since they
 * are managed in the separate player dock and are NOT part of the board canvas.
 */
export function isBoardSnapTarget(widget: TabletopWidget, draggedType?: TabletopWidget['type']): boolean {
  if (widget.type === 'deck') return draggedType === 'card' || !draggedType;
  if (widget.type === 'holder') {
    const holder = widget as HolderWidget;
    if (isHandHolder(holder)) return false;
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
  return (
    (hasSeat
      ? Object.values(widgets).find(
          (w): w is HolderWidget =>
            w.type === 'holder' &&
            isHandHolder(w as HolderWidget) &&
            (w.id.toLowerCase().includes(seatPrefix) || w.ownerSeat === seatIdx || w.ownerSeat === seatIdx - 1),
        )
      : undefined) ||
    Object.values(widgets).find(
      (w): w is HolderWidget =>
        w.type === 'holder' && isHandHolder(w as HolderWidget),
    )
  );
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
    if (requireSeat && hasSeat && !hId.includes(seatPrefix) && w.ownerSeat !== seatIdx && w.ownerSeat !== seatIdx - 1) {
      return false;
    }
    const wLabel = (draggedWidget.label || draggedWidget.id).toLowerCase();
    const matches = ['road', 'settlement', 'city', 'ship'].some((k) => wLabel.includes(k) && hId.includes(k));
    return matches || isSupplyReserveHolder(w);
  };
  return (
    Object.values(widgets).find((w): w is HolderWidget => w.type === 'holder' && matchTokenLabel(w, true)) ||
    Object.values(widgets).find((w): w is HolderWidget => w.type === 'holder' && matchTokenLabel(w, false))
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
      if (isHandHolder(h)) return false;
      if (isSupplyReserveHolder(h)) return false;
      return true;
    });
}

/**
 * Returns non-holder widgets that should be rendered on the table canvas.
 * Filters out cards currently in hand and unplaced reserve tokens when running with dock/local mode.
 */
export function filterBoardWidgets(
  widgets: Record<string, TabletopWidget>,
  visibleIds: Set<string>,
  isTvMode = false,
): TabletopWidget[] {
  return Object.values(widgets)
    .filter((w) => {
      if (w.type === 'holder') return false;
      if (!visibleIds.has(w.id)) return false;
      if (w.type === 'card') {
        const card = w as CardWidget;
        if (card.inPile || isCardInDeck(w.id, widgets)) return false;
        if (!isTvMode && isCardInHand(w.id, widgets)) return false;
      }
      if (!isTvMode && w.type === 'token' && isPieceInSupplyReserve(w, widgets)) return false;
      return true;
    })
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}
