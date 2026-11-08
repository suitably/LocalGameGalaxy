/**
 * Deal cards from a deck into every player's hand [ID: LOGIC-TABLETOP-DEAL]
 *
 * Round robin in seat order (`ownerSeat`), one card per hand per round, as ordinary
 * `DRAW_CARD` actions so dealing syncs and animates like a single draw.
 */
import type { DeckWidget, HolderWidget, TabletopWidget } from './types';
import type { TabletopAction } from './tabletopReducer';
import { isHandHolderWidget } from './handHolder';

/** Player hands in seat order; hands without a seat come last. */
export function handsInSeatOrder(widgets: Record<string, TabletopWidget>): HolderWidget[] {
  return Object.values(widgets)
    .filter((w): w is HolderWidget => isHandHolderWidget(w as HolderWidget))
    .sort((a, b) => (a.ownerSeat ?? 99) - (b.ownerSeat ?? 99));
}

export function dealActions(
  widgets: Record<string, TabletopWidget>,
  deckId: string,
  perHand = 1,
): TabletopAction[] {
  const deck = widgets[deckId];
  if (!deck || deck.type !== 'deck') return [];
  const hands = handsInSeatOrder(widgets);
  const available = (deck as DeckWidget).cardIds.length;
  const count = Math.min(available, hands.length * perHand);
  return Array.from({ length: count }, (_, i) => ({
    type: 'DRAW_CARD' as const,
    payload: { deckId, targetHolderId: hands[i % hands.length].id },
  }));
}
