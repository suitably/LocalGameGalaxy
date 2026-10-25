/**
 * Overlapping fan layout for the hand dock [ID: LOGIC-TABLETOP-HAND-FAN]
 *
 * Mobile card games (Hearthstone, Balatro) overlap the hand so every card stays reachable
 * without scrolling: cards spread out while there is room and overlap more as the hand
 * grows, with a slight arc. Below `minStep` visible pixels per card the fan scrolls instead.
 */
import type { CardWidget } from './types';
import type { HandCardGroup } from './handLayout';

export interface FanSlot {
  /** Left edge of the card inside the fan, px. */
  x: number;
  /** Rotation in degrees (negative = tilted left). */
  rotate: number;
  /** Downward offset in px for the arc (outer cards sit lower). */
  drop: number;
}

export interface FanLayout {
  slots: FanSlot[];
  /** Total width of the fan, px. */
  width: number;
  /** Visible width per card, px. */
  step: number;
  /** The fan is wider than the container even at `minStep` and needs to scroll. */
  overflow: boolean;
}

export interface FanOptions {
  /** Gap between cards while they fit side by side. */
  gap?: number;
  /** Smallest visible strip per card before the fan scrolls. */
  minStep?: number;
  /** Rotation of the outermost cards. */
  maxAngle?: number;
  /** Arc depth at the outermost cards. */
  maxDrop?: number;
}

export function fanLayout(
  count: number,
  containerWidth: number,
  cardWidth: number,
  { gap = 6, minStep = 22, maxAngle = 8, maxDrop = 10 }: FanOptions = {},
): FanLayout {
  if (count <= 0) return { slots: [], width: 0, step: 0, overflow: false };
  if (count === 1) {
    return {
      slots: [{ x: 0, rotate: 0, drop: 0 }],
      width: cardWidth,
      step: cardWidth,
      overflow: false,
    };
  }
  const fitStep = (Math.max(0, containerWidth) - cardWidth) / (count - 1);
  const step = Math.max(minStep, Math.min(cardWidth + gap, fitStep));
  const overlapping = step < cardWidth;
  const mid = (count - 1) / 2;
  const slots = Array.from({ length: count }, (_, i) => {
    const t = (i - mid) / mid; // -1 … 1
    return {
      x: Math.round(i * step),
      rotate: overlapping ? Math.round(t * maxAngle * 10) / 10 : 0,
      drop: overlapping ? Math.round(t * t * maxDrop) : 0,
    };
  });
  const width = Math.round(cardWidth + step * (count - 1));
  return { slots, width, step, overflow: width > containerWidth };
}

export interface HandSlotItem {
  key: string;
  card: CardWidget;
  /** Stacked identical cards (resources): count badge on the top card. */
  count: number;
}

/** One fan slot per action card and one per stack of identical cards. */
export function handSlots(groups: HandCardGroup[]): HandSlotItem[] {
  return groups.flatMap((g) =>
    g.isAction
      ? g.cards.map((card) => ({ key: card.id, card, count: 1 }))
      : [{ key: g.key, card: g.cards[g.cards.length - 1], count: g.cards.length }],
  );
}
