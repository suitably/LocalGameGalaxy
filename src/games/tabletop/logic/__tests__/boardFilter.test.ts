import { describe, it, expect } from 'vitest';
import {
  isHandHolder,
  isSupplyReserveHolder,
  isPieceInSupplyReserve,
  isCardInDeck,
  filterBoardHolders,
  filterBoardWidgets,
  isBoardSnapTarget,
} from '../boardFilter';
import type { HolderWidget, TokenWidget, CardWidget, TabletopWidget, DeckWidget } from '../types';

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

  it('filters out cards that are inside a deck or pile from board widgets in all modes', () => {
    const widgets: Record<string, TabletopWidget> = {
      'deck1': { id: 'deck1', type: 'deck', cardIds: ['cardInDeck'] } as DeckWidget,
      'cardInDeck': { id: 'cardInDeck', type: 'card' } as CardWidget,
      'cardInPile': { id: 'cardInPile', type: 'card', inPile: true } as CardWidget,
      'cardFree': { id: 'cardFree', type: 'card', inPile: false } as CardWidget,
    };
    const visibleIds = new Set(['cardInDeck', 'cardInPile', 'cardFree']);

    expect(isCardInDeck('cardInDeck', widgets)).toBe(true);
    expect(isCardInDeck('cardFree', widgets)).toBe(false);

    const localWidgets = filterBoardWidgets(widgets, visibleIds, false);
    expect(localWidgets.map((w) => w.id)).toEqual(['cardFree']);

    const tvWidgets = filterBoardWidgets(widgets, visibleIds, true);
    expect(tvWidgets.map((w) => w.id)).toEqual(['cardFree']);
  });

  it('identifies valid board snap targets correctly', () => {
    const deck = { id: 'deck1', type: 'deck' } as TabletopWidget;
    const boardHolder = { id: 'discardPile', type: 'holder' } as TabletopWidget;
    const handHolder = { id: 'player1Hand', type: 'holder', isHand: true } as TabletopWidget;
    const supplyHolder = { id: 'Player 1 - Roads', type: 'holder' } as TabletopWidget;
    const playerAreaHolder = { id: 'area1', type: 'holder', ownerSeat: 0 } as TabletopWidget;
    const spielerbereichHolder = { id: 'sb', label: 'Spielerbereich', type: 'holder' } as TabletopWidget;
    const card = { id: 'c1', type: 'card' } as TabletopWidget;

    expect(isBoardSnapTarget(deck)).toBe(true);
    expect(isBoardSnapTarget(boardHolder)).toBe(true);
    expect(isBoardSnapTarget(handHolder)).toBe(false);
    expect(isBoardSnapTarget(supplyHolder)).toBe(false);
    expect(isBoardSnapTarget(playerAreaHolder)).toBe(false);
    expect(isBoardSnapTarget(spielerbereichHolder)).toBe(false);
    expect(isBoardSnapTarget(card)).toBe(false);
  });
});
