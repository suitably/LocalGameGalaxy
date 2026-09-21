import type { CardWidget, HolderWidget } from './types';

export interface HandLayoutResult {
  [cardId: string]: {
    x: number;
    y: number;
    zIndex: number;
    stackCount?: number;
  };
}

/**
 * Checks whether a card is considered an action/development card
 * that should be cascaded (shown side-by-side with overlap) rather than stacked compactly.
 */
export function isActionCard(card: CardWidget): boolean {
  const deckId = (card.deckId || '').toLowerCase();
  const cardType = (card.cardType || '').toLowerCase();

  if (deckId.includes('develop') || deckId.includes('action')) return true;
  if (['knight', '1 point', 'roads', 'monopoly', 'resources', 'ritter', 'siegpunkt', 'straßenbau', 'erfindung', 'monopol'].includes(cardType)) {
    return true;
  }
  return false;
}

/**
 * Checks whether a card is considered an open resource card (e.g. Wood, Brick, Wool, Ore, Wheat, etc.)
 */
export function isResourceCard(card: CardWidget): boolean {
  const deckId = (card.deckId || '').toLowerCase();
  const cardType = (card.cardType || '').toLowerCase();
  const label = (card.label || '').toLowerCase();

  if (deckId.includes('resource') || deckId.includes('rohstoff')) {
    if (isActionCard(card)) return false;
    return true;
  }

  const resourceNames = [
    'wood', 'brick', 'wool', 'wheat', 'ore', 'grain', 'sheep', 'lumber', 'clay',
    'stone', 'gold', 'iron', 'coal', 'food', 'water',
    'holz', 'lehm', 'wolle', 'getreide', 'erz', 'stein', 'rohstoff', 'resource',
  ];

  if (resourceNames.some((r) => cardType === r || cardType.includes(r) || label === r || label.includes(r))) {
    if (isActionCard(card)) return false;
    return true;
  }

  return false;
}

/**
 * Calculates optimal positions, stacking offsets, and quantity badges for cards in a hand holder.
 *
 * 1. Groups cards by type (e.g. Wood, Bricks, Wool, Ore, Wheat, Knight, etc.).
 * 2. Resource cards (identical types) are neatly stacked with a small 2px offset and a count badge (e.g. ×3).
 * 3. Action cards are cascaded (28px horizontal offset) so every card underneath remains visible and readable.
 * 4. Between different groups, generous spacing (36px–48px) is maintained.
 */
export function calculateHandLayout(
  handHolder: HolderWidget,
  cards: CardWidget[],
): HandLayoutResult {
  const result: HandLayoutResult = {};
  if (cards.length === 0) return result;

  // Group cards by groupKey (cardType > label > deckId > 'card')
  const groupMap = new Map<string, CardWidget[]>();
  const groupOrder: string[] = [];

  for (const card of cards) {
    const key = card.cardType || card.label || card.deckId || 'card';
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      groupOrder.push(key);
    }
    groupMap.get(key)!.push(card);
  }

  const defaultCardW = cards[0]?.width || 80;
  const defaultCardH = cards[0]?.height || 120;
  const baseY = handHolder.y + Math.max(6, (handHolder.height - defaultCardH) / 2);

  // Measure required width for each group
  const groupWidths: number[] = [];
  const groupIsAction: boolean[] = [];

  for (const key of groupOrder) {
    const groupCards = groupMap.get(key)!;
    const action = isActionCard(groupCards[0]);
    groupIsAction.push(action);

    if (action) {
      // Cascaded: card width + 28px for each additional card
      const w = defaultCardW + (groupCards.length - 1) * 28;
      groupWidths.push(w);
    } else {
      // Compact stack: card width + 2px for each additional card
      const w = defaultCardW + (groupCards.length - 1) * 2;
      groupWidths.push(w);
    }
  }

  const numGroups = groupOrder.length;
  const totalGroupWidths = groupWidths.reduce((sum, w) => sum + w, 0);
  const horizontalPadding = 24;
  const availableWidth = Math.max(0, handHolder.width - horizontalPadding * 2);

  // Desired gap between distinct groups is 36px to 48px
  let groupGap = 40;
  if (numGroups > 1) {
    const spaceForGaps = availableWidth - totalGroupWidths;
    if (spaceForGaps > 0) {
      groupGap = Math.min(48, Math.max(20, spaceForGaps / (numGroups - 1)));
    } else {
      groupGap = Math.max(16, (availableWidth - totalGroupWidths) / (numGroups - 1));
    }
  }

  let currentX = handHolder.x + horizontalPadding;
  let globalZ = handHolder.zIndex + 10;

  for (let gIdx = 0; gIdx < numGroups; gIdx++) {
    const key = groupOrder[gIdx];
    const groupCards = groupMap.get(key)!;
    const isAction = groupIsAction[gIdx];
    const count = groupCards.length;

    if (isAction) {
      // Cascading layout: offset each card by 28px horizontally
      groupCards.forEach((c, idx) => {
        result[c.id] = {
          x: Math.round(currentX + idx * 28),
          y: Math.round(baseY),
          zIndex: globalZ++,
          stackCount: undefined,
        };
      });
      currentX += groupWidths[gIdx] + groupGap;
    } else {
      // Compact stacked layout: offset by 2px, top card has stackCount
      groupCards.forEach((c, idx) => {
        const isTopCard = idx === count - 1;
        result[c.id] = {
          x: Math.round(currentX + idx * 2),
          y: Math.round(baseY - idx * 2),
          zIndex: globalZ++,
          stackCount: isTopCard && count > 1 ? count : undefined,
        };
      });
      currentX += groupWidths[gIdx] + groupGap;
    }
  }

  return result;
}

/**
 * Checks whether a card is currently located in any player hand holder.
 */
export function isCardInHand(
  cardId: string,
  widgets: Record<string, { type: string; id?: string; isHand?: boolean; childIds?: string[] }>
): boolean {
  return Object.values(widgets).some(
    (w) =>
      w.type === 'holder' &&
      ((w.id || '').toLowerCase() === 'hand' || Boolean(w.isHand) || (w.id || '').toLowerCase().includes('hand')) &&
      Array.isArray(w.childIds) &&
      w.childIds.includes(cardId)
  );
}
