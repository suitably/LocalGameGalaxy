import { describe, it, expect } from 'vitest';
import { tabletopReducer } from '../tabletopReducer';
import type { TabletopGameState } from '../tabletopReducer';
import type { CardWidget, DeckWidget, HolderWidget } from '../types';

describe('tabletopReducer', () => {
  const initialState: TabletopGameState = {
    flyingCards: [],
    game: {
      id: 'test_game',
      name: 'Test Game',
      version: '1.0.0',
      minPlayers: 1,
      maxPlayers: 4,
      supportedModes: ['party_multi_device'],
      table: { width: 1600, height: 1000 },
      widgets: {
        deck1: {
          id: 'deck1',
          type: 'deck',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 1,
          cardIds: ['c1', 'c2'],
          backContent: { type: 'text', value: '🂠' },
        } as DeckWidget,
        c1: {
          id: 'c1',
          type: 'card',
          deckId: 'deck1',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 1,
          frontContent: { type: 'text', value: 'Card 1' },
          backContent: { type: 'text', value: '🂠' },
          faceUp: false,
          rotation: 0,
        } as CardWidget,
        c2: {
          id: 'c2',
          type: 'card',
          deckId: 'deck1',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 1,
          frontContent: { type: 'text', value: 'Card 2' },
          backContent: { type: 'text', value: '🂠' },
          faceUp: false,
          rotation: 0,
        } as CardWidget,
        hand1: {
          id: 'hand1',
          type: 'holder',
          isHand: true,
          ownerSeat: 0,
          x: 200,
          y: 500,
          width: 240,
          height: 140,
          zIndex: 10,
          dropTargetTypes: ['card'],
          childIds: [],
          layout: 'fan',
        } as HolderWidget,
      },
    },
  };

  it('flips card faceUp state on FLIP_CARD', () => {
    const cardBefore = initialState.game.widgets.c1 as CardWidget;
    expect(cardBefore.faceUp).toBe(false);

    const stateFlipped = tabletopReducer(initialState, {
      type: 'FLIP_CARD',
      payload: { cardId: 'c1' },
    });

    const cardAfter = stateFlipped.game.widgets.c1 as CardWidget;
    expect(cardAfter.faceUp).toBe(true);
  });

  it('draws top card from deck into player hand', () => {
    const stateDrawn = tabletopReducer(initialState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });

    const deckAfter = stateDrawn.game.widgets.deck1 as DeckWidget;
    expect(deckAfter.cardIds).toEqual(['c1']);

    const drawnCard = stateDrawn.game.widgets.c2 as CardWidget;
    expect(drawnCard.faceUp).toBe(true);
    expect(drawnCard.inPile).toBe(false);
    expect(drawnCard.x).toBe(210);

    const handAfter = stateDrawn.game.widgets.hand1 as HolderWidget;
    expect(handAfter.childIds).toContain('c2');
  });

  it('rotates card on ROTATE_CARD', () => {
    const stateRotated = tabletopReducer(initialState, {
      type: 'ROTATE_CARD',
      payload: { cardId: 'c1', deltaDegrees: 90 },
    });

    const cardAfter = stateRotated.game.widgets.c1 as CardWidget;
    expect(cardAfter.rotation).toBe(90);
  });
});
