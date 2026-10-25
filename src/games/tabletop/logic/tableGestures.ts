/**
 * Table gestures: what a press, drag, shake or key does to a widget [ID: LOGIC-TABLETOP-GESTURES]
 *
 * Sources (decks, bags) deal on a tap and on a drag, and move as a whole after a long press.
 * Shuffling a deck and rolling a die are the same "shake" action (S key, shaking while
 * dragging, context menu); flipping a card is F, a double tap or the context menu.
 */
import type { BagWidget, DeckWidget, TabletopWidget } from './types';
import type { TabletopAction } from './tabletopReducer';

/** Hold this long without moving to pick up a whole deck or bag. */
export const LONG_PRESS_MS = 450;
/** Pointer travel (px) that turns a press into a drag. */
export const DRAG_THRESHOLD_PX = 6;

export type SourceKind = 'deck' | 'bag';

/** A deck with cards or a non-empty bag deals; anything else is moved directly. */
export function sourceKind(widget: TabletopWidget, canDraw: boolean): SourceKind | null {
  if (!canDraw) return null;
  if (widget.type === 'deck') return (widget as DeckWidget).cardIds?.length > 0 ? 'deck' : null;
  if (widget.type === 'bag') {
    const bag = widget as BagWidget;
    if (bag.isInfinite) return bag.templateWidget ? 'bag' : null;
    return (bag.itemIds?.length ?? 0) > 0 ? 'bag' : null;
  }
  return null;
}

/** The deck shows its faces (an open discard pile): cards dragged off it stay face up. */
export function deckShowsFront(deck: DeckWidget): boolean {
  return deck.faceUp === true || (deck.activeFace !== undefined && deck.activeFace > 0);
}

/** Id of the widget a drag off this source takes: top card, last bag item or a fresh clone. */
export function nextSourceItemId(
  widget: TabletopWidget,
  newId: () => string = () =>
    `tok_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
): string | null {
  if (widget.type === 'deck') {
    const ids = (widget as DeckWidget).cardIds || [];
    return ids.length > 0 ? ids[ids.length - 1] : null;
  }
  if (widget.type === 'bag') {
    const bag = widget as BagWidget;
    if (bag.isInfinite) return bag.templateWidget ? newId() : null;
    const ids = bag.itemIds || [];
    return ids.length > 0 ? ids[ids.length - 1] : null;
  }
  return null;
}

/** Shuffle a deck or roll a die — one action for S, shaking and the context menu. */
export function shakeActionFor(widget: TabletopWidget | undefined): TabletopAction | null {
  if (!widget) return null;
  if (widget.type === 'deck' && (widget as DeckWidget).cardIds?.length > 1) {
    return { type: 'SHUFFLE_DECK', payload: { deckId: widget.id } };
  }
  if (widget.type === 'die') return { type: 'ROLL_DIE', payload: { dieId: widget.id } };
  return null;
}

/** Flip a card — F, double tap and the context menu. */
export function flipActionFor(widget: TabletopWidget | undefined): TabletopAction | null {
  if (widget?.type !== 'card') return null;
  return { type: 'FLIP_CARD', payload: { cardId: widget.id } };
}

export interface ShakeTracker {
  /** Feed a pointer position; true once the motion counts as a shake (then resets). */
  push: (x: number, y: number, t: number) => boolean;
  reset: () => void;
}

/**
 * Detects shaking while dragging: `reversals` changes of direction, each after at least
 * `minTravel` px, within `windowMs`. Either axis counts.
 */
export function createShakeTracker({
  reversals = 4,
  minTravel = 18,
  windowMs = 900,
}: { reversals?: number; minTravel?: number; windowMs?: number } = {}): ShakeTracker {
  type Axis = { anchor: number; dir: 0 | 1 | -1 };
  let axes: Axis[] = [];
  let turns: number[] = [];

  const reset = () => {
    axes = [];
    turns = [];
  };

  const push = (x: number, y: number, t: number) => {
    if (axes.length === 0) {
      axes = [
        { anchor: x, dir: 0 },
        { anchor: y, dir: 0 },
      ];
      return false;
    }
    [x, y].forEach((v, i) => {
      const axis = axes[i];
      const delta = v - axis.anchor;
      if (Math.abs(delta) < minTravel) return;
      const dir = delta > 0 ? 1 : -1;
      if (axis.dir !== 0 && dir !== axis.dir) turns.push(t);
      axis.dir = dir;
      axis.anchor = v;
    });
    turns = turns.filter((ts) => t - ts <= windowMs);
    if (turns.length >= reversals) {
      reset();
      return true;
    }
    return false;
  };

  return { push, reset };
}

/** Key shortcuts on the table: F flips, S shakes. Ignores typing and modifier chords. */
export function tableKeyAction(
  key: string,
  widget: TabletopWidget | undefined,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {},
): TabletopAction | null {
  if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) return null;
  const k = key.toLowerCase();
  if (k === 'f') return flipActionFor(widget);
  if (k === 's') return shakeActionFor(widget);
  return null;
}
