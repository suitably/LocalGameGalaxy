/**
 * Picking hand cards and a table card for a move [ID: LOGIC-TABLETOP-SCRIPT-SELECTION]
 */
import type { CardId } from './cardDeck';
import type { ScriptMove, ScriptView } from './scriptTypes';

export interface Selection {
  cards: CardId[];
  target: CardId | null;
}

export const NO_SELECTION: Selection = { cards: [], target: null };

/** Drops picks that are no longer possible; a single possible target is taken by itself. */
export function normalize(sel: Selection, view: ScriptView): Selection {
  const cards = view.select === 'none' ? [] : sel.cards.filter((c) => view.hand.includes(c));
  const target =
    sel.target && view.targets.includes(sel.target)
      ? sel.target
      : view.targets.length === 1
        ? view.targets[0]
        : null;
  return { cards: view.select === 'one' ? cards.slice(-1) : cards, target };
}

export const moveOf = (sel: Selection): ScriptMove => ({
  kind: 'cards',
  cards: sel.cards,
  ...(sel.target ? { target: sel.target } : {}),
});

/** Tap on a hand card: pick it, or put a picked one back (`many`). */
export function toggleCard(sel: Selection, card: CardId, view: ScriptView): Selection {
  if (view.select === 'none') return sel;
  if (view.select === 'one') return { ...sel, cards: [card] };
  return {
    ...sel,
    cards: sel.cards.includes(card) ? sel.cards.filter((c) => c !== card) : [...sel.cards, card],
  };
}

/** Whether a single card could be played now, onto any target. */
export function playableAlone(
  card: CardId,
  view: ScriptView,
  allowed: (move: ScriptMove) => boolean,
): boolean {
  if (view.targets.length === 0) return allowed({ kind: 'cards', cards: [card] });
  return view.targets.some((target) => allowed({ kind: 'cards', cards: [card], target }));
}
