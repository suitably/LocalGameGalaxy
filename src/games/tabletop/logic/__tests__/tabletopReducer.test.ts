import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import type { CardWidget, DeckWidget, HolderWidget } from '../types';

describe('tabletopReducer card handling', () => {
  const baseState: TabletopGameState = {
    game: {
      id: 'test-game',
      name: 'Test Game',
      version: '1.0.0',
      minPlayers: 1,
      maxPlayers: 4,
      supportedModes: ['local_pass_and_play'],
      table: { width: 1000, height: 800 },
      widgets: {
        deck1: {
          id: 'deck1',
          type: 'deck',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 10,
          cardIds: ['c3', 'c2', 'c1'],
          cardCount: 3,
          backContent: { type: 'text', value: '🂠' },
        } as DeckWidget,
        c3: {
          id: 'c3',
          type: 'card',
          deckId: 'deck1',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 10,
          inPile: true,
          faceUp: false,
          rotation: 0,
          frontContent: { type: 'text', value: 'Queen' },
          backContent: { type: 'text', value: '🂠' },
        } as CardWidget,
        c2: {
          id: 'c2',
          type: 'card',
          deckId: 'deck1',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 10,
          inPile: true,
          faceUp: false,
          rotation: 0,
          frontContent: { type: 'text', value: 'King' },
          backContent: { type: 'text', value: '🂠' },
        } as CardWidget,
        c1: {
          id: 'c1',
          type: 'card',
          deckId: 'deck1',
          x: 100,
          y: 100,
          width: 80,
          height: 120,
          zIndex: 10,
          inPile: true,
          faceUp: false,
          rotation: 0,
          frontContent: { type: 'text', value: 'Ace' },
          backContent: { type: 'text', value: '🂠' },
        } as CardWidget,
        playerHand: {
          id: 'playerHand',
          type: 'holder',
          x: 200,
          y: 600,
          width: 400,
          height: 150,
          zIndex: 5,
          childIds: [],
          dropTargetTypes: ['card'],
          layout: 'fan',
          isHand: true,
          ownerSeat: 0,
        } as HolderWidget,
      },
    },
    flyingCards: [],
  };

  it('draws card to player hand on click (no position provided)', () => {
    const nextState = tabletopReducer(baseState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });

    const deck = nextState.game.widgets.deck1 as DeckWidget;
    expect(deck.cardIds).toEqual(['c3', 'c2']);
    expect(deck.cardCount).toBe(2);

    const drawnCard = nextState.game.widgets.c1 as CardWidget;
    expect(drawnCard.inPile).toBe(false);
    expect(drawnCard.faceUp).toBe(true);
    const hand = nextState.game.widgets.playerHand as HolderWidget;
    expect(hand.childIds).toContain('c1');
    expect(drawnCard.x).toBeGreaterThanOrEqual(hand.x);
    expect(drawnCard.y).toBeGreaterThanOrEqual(hand.y);
  });

  it('draws card at specific position when dragged from deck', () => {
    const nextState = tabletopReducer(baseState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1', position: { x: 150, y: 250 } },
    });

    const drawnCard = nextState.game.widgets.c1 as CardWidget;
    expect(drawnCard.x).toBe(150);
    expect(drawnCard.y).toBe(250);
    expect(drawnCard.inPile).toBe(false);
    expect(drawnCard.faceUp).toBe(true);
  });

  it('returns card to deck when snapped/dropped on deck', () => {
    const stateAfterDraw = tabletopReducer(baseState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1', position: { x: 500, y: 500 } },
    });

    const stateAfterReturn = tabletopReducer(stateAfterDraw, {
      type: 'SNAP_TO_HOLDER',
      payload: { widgetId: 'c1', holderId: 'deck1' },
    });

    const deck = stateAfterReturn.game.widgets.deck1 as DeckWidget;
    expect(deck.cardIds).toContain('c1');
    expect(deck.cardCount).toBe(3);

    const card = stateAfterReturn.game.widgets.c1 as CardWidget;
    expect(card.inPile).toBe(true);
    expect(card.pileId).toBe('deck1');
  });

  it('flips card and toggles faceUp and activeFace', () => {
    const flipped = tabletopReducer(baseState, {
      type: 'FLIP_CARD',
      payload: { cardId: 'c1' },
    });
    const card = flipped.game.widgets.c1 as CardWidget;
    expect(card.faceUp).toBe(true);
    expect(card.activeFace).toBe(1);

    const flippedBack = tabletopReducer(flipped, {
      type: 'FLIP_CARD',
      payload: { cardId: 'c1' },
    });
    const cardBack = flippedBack.game.widgets.c1 as CardWidget;
    expect(cardBack.faceUp).toBe(false);
    expect(cardBack.activeFace).toBe(0);
  });

  it('rotates card on ROTATE_CARD', () => {
    const stateRotated = tabletopReducer(baseState, {
      type: 'ROTATE_CARD',
      payload: { cardId: 'c1', deltaDegrees: 90 },
    });

    const cardAfter = stateRotated.game.widgets.c1 as CardWidget;
    expect(cardAfter.rotation).toBe(90);
  });

  it('stacks identical cards in hand and computes stackCount', () => {
    const stateWithTypes: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          c1: { ...(baseState.game.widgets.c1 as CardWidget), cardType: 'Wood' },
          c2: { ...(baseState.game.widgets.c2 as CardWidget), cardType: 'Wood' },
        },
      },
    };

    const state1 = tabletopReducer(stateWithTypes, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });
    const state2 = tabletopReducer(state1, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });

    const c1 = state2.game.widgets.c1 as CardWidget;
    const c2 = state2.game.widgets.c2 as CardWidget;
    expect(c2.stackCount).toBe(2);
    expect(c1.stackCount).toBeUndefined();
    expect(c2.zIndex).toBeGreaterThan(c1.zIndex);
  });

  it('plays card from hand onto the board', () => {
    const drawnState = tabletopReducer(baseState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });
    const handBefore = drawnState.game.widgets.playerHand as HolderWidget;
    expect(handBefore.childIds).toContain('c1');

    const playedState = tabletopReducer(drawnState, {
      type: 'PLAY_CARD_FROM_HAND',
      payload: { cardId: 'c1', position: { x: 450, y: 350 } },
    });

    const handAfter = playedState.game.widgets.playerHand as HolderWidget;
    expect(handAfter.childIds).not.toContain('c1');

    const cardOnBoard = playedState.game.widgets.c1 as CardWidget;
    expect(cardOnBoard.parent).toBeUndefined();
    expect(cardOnBoard.x).toBe(450);
    expect(cardOnBoard.y).toBe(350);
    expect(cardOnBoard.faceUp).toBe(true);
    expect(cardOnBoard.activeFace).toBe(1);
    expect(cardOnBoard.zIndex).toBe(5000);
  });

  it('takes piece from supply with grid snapping', () => {
    const stateWithPiece: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          'Player 1 - Roads': {
            id: 'Player 1 - Roads',
            type: 'holder',
            childIds: ['roadA'],
          } as unknown as HolderWidget,
          'roadA': {
            id: 'roadA',
            type: 'token',
            parent: 'Player 1 - Roads',
            width: 30,
            height: 30,
            grid: [{ type: 'hex', x: 50, y: 50 }],
          } as unknown as CardWidget,
        },
      },
    };

    const nextState = tabletopReducer(stateWithPiece, {
      type: 'TAKE_PIECE_FROM_SUPPLY',
      payload: { pieceId: 'roadA', targetPosition: { x: 104, y: 96 } },
    });

    const holder = nextState.game.widgets['Player 1 - Roads'] as HolderWidget;
    expect(holder.childIds).not.toContain('roadA');

    const road = nextState.game.widgets['roadA'];
    expect(road.parent).toBeUndefined();
    expect(road.x).toBe(100);
    expect(road.y).toBe(100);
    expect(road.zIndex).toBe(5000);
  });
});
