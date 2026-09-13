import { describe, it, expect } from 'vitest';
import { tabletopReducer } from '../../logic/tabletopReducer';
import type { TabletopGameState } from '../../logic/tabletopReducer';
import { validateAndSanitizeGame } from '../../logic/gameValidator';
import type { DeckWidget, HolderWidget, DieWidget } from '../../logic/types';

describe('Tabletop sync action reductions', () => {
  const baseGame = validateAndSanitizeGame({
    name: 'Sync Test Game',
    widgets: {
      deck1: { id: 'deck1', type: 'deck', x: 0, y: 0, cardIds: ['c1', 'c2'] },
      hand1: { id: 'hand1', type: 'holder', isHand: true, ownerSeat: 0, childIds: [] },
      discard: { id: 'discard', type: 'holder', dropTarget: true, childIds: [] },
      die1: { id: 'die1', type: 'die', currentValue: 1, sides: 6 },
    },
  });

  const initialState: TabletopGameState = {
    game: baseGame,
    flyingCards: [],
  };

  it('draws a card into a target holder', () => {
    const nextState = tabletopReducer(initialState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1', targetHolderId: 'hand1' },
    });

    const deck = nextState.game.widgets.deck1 as DeckWidget;
    const hand = nextState.game.widgets.hand1 as HolderWidget;

    expect(deck.cardIds).toEqual(['c2']);
    expect(hand.childIds).toEqual(['c1']);
  });

  it('handles card flick to table and adds flying animation', () => {
    const nextState = tabletopReducer(initialState, {
      type: 'ANIMATE_CARD_TO_TABLE',
      payload: { cardId: 'c1', targetHolderId: 'discard' },
    });

    expect(nextState.flyingCards.length).toBe(1);
    expect(nextState.flyingCards[0].cardId).toBe('c1');

    const discard = nextState.game.widgets.discard as HolderWidget;
    expect(discard.childIds).toContain('c1');
  });

  it('rolls a die deterministically or randomly', () => {
    const nextState = tabletopReducer(initialState, {
      type: 'ROLL_DIE',
      payload: { dieId: 'die1', value: 5 },
    });

    const die = nextState.game.widgets.die1 as DieWidget;
    expect(die.currentValue).toBe(5);
  });
});
