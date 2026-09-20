import { describe, it, expect } from 'vitest';
import {
  isHandHolder,
  isSupplyReserveHolder,
  isPieceInSupplyReserve,
  filterBoardHolders,
  filterBoardWidgets,
} from '../boardFilter';
import type { HolderWidget, TokenWidget, CardWidget, TabletopWidget } from '../types';

describe('boardFilter', () => {
  it('identifies hand holders correctly', () => {
    const hand1 = { id: 'Hand', type: 'holder', isHand: true } as HolderWidget;
    const hand2 = { id: 'Player 1 - Hand', type: 'holder' } as HolderWidget;
    const normalHolder = { id: 'Discard', type: 'holder' } as HolderWidget;

    expect(isHandHolder(hand1)).toBe(true);
    expect(isHandHolder(hand2)).toBe(true);
    expect(isHandHolder(normalHolder)).toBe(false);
  });

  it('identifies supply reserve holders correctly', () => {
    const roadHolder = { id: 'Player 1 - Roads', type: 'holder' } as HolderWidget;
    const settlementHolder = { id: 'Player 2 - Settlements', type: 'holder' } as HolderWidget;
    const generalHolder = { id: 'BoardArea', type: 'holder' } as HolderWidget;

    expect(isSupplyReserveHolder(roadHolder)).toBe(true);
    expect(isSupplyReserveHolder(settlementHolder)).toBe(true);
    expect(isSupplyReserveHolder(generalHolder)).toBe(false);
  });

  it('identifies pieces in supply reserve correctly', () => {
    const widgets: Record<string, TabletopWidget> = {
      'Player 1 - Roads': { id: 'Player 1 - Roads', type: 'holder', childIds: ['road1'] } as HolderWidget,
      'road1': { id: 'road1', type: 'token', parent: 'Player 1 - Roads' } as TokenWidget,
      'roadPlaced': { id: 'roadPlaced', type: 'token', parent: undefined } as TokenWidget,
    };

    expect(isPieceInSupplyReserve(widgets['road1'], widgets)).toBe(true);
    expect(isPieceInSupplyReserve(widgets['roadPlaced'], widgets)).toBe(false);
  });

  it('filters board holders excluding hand holders and supply containers in local mode', () => {
    const widgets: Record<string, TabletopWidget> = {
      'Hand': { id: 'Hand', type: 'holder', isHand: true } as HolderWidget,
      'Player 1 - Roads': { id: 'Player 1 - Roads', type: 'holder' } as HolderWidget,
      'Discard': { id: 'Discard', type: 'holder' } as HolderWidget,
    };
    const visibleIds = new Set(['Hand', 'Player 1 - Roads', 'Discard']);

    const localHolders = filterBoardHolders(widgets, visibleIds, false);
    expect(localHolders.map((h) => h.id)).toEqual(['Discard']);

    const tvHolders = filterBoardHolders(widgets, visibleIds, true);
    expect(tvHolders.length).toBe(3);
  });

  it('filters board widgets excluding cards in hand and reserve pieces in local mode', () => {
    const widgets: Record<string, TabletopWidget> = {
      'Hand': { id: 'Hand', type: 'holder', isHand: true, childIds: ['cardInHand'] } as HolderWidget,
      'Player 1 - Roads': { id: 'Player 1 - Roads', type: 'holder', childIds: ['roadInReserve'] } as HolderWidget,
      'cardInHand': { id: 'cardInHand', type: 'card', parent: 'Hand' } as CardWidget,
      'cardOnTable': { id: 'cardOnTable', type: 'card' } as CardWidget,
      'roadInReserve': { id: 'roadInReserve', type: 'token', parent: 'Player 1 - Roads' } as TokenWidget,
      'roadOnTable': { id: 'roadOnTable', type: 'token' } as TokenWidget,
    };
    const visibleIds = new Set(['cardInHand', 'cardOnTable', 'roadInReserve', 'roadOnTable']);

    const boardWidgets = filterBoardWidgets(widgets, visibleIds, false);
    const ids = boardWidgets.map((w) => w.id);

    expect(ids).toContain('cardOnTable');
    expect(ids).toContain('roadOnTable');
    expect(ids).not.toContain('cardInHand');
    expect(ids).not.toContain('roadInReserve');
  });
});
