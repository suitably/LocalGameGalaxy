import { describe, it, expect } from 'vitest';
import { tabletopReducer, type TabletopGameState } from '../tabletopReducer';
import type { CardWidget, DeckWidget, HolderWidget, TokenWidget } from '../types';
import { isPieceInSupplyReserve } from '../boardFilter';
import { getPlayerSupplyPieces } from '../seatLogic';

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

  it('draws a specific cardId when provided in payload', () => {
    const nextState = tabletopReducer(baseState, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1', cardId: 'c2', position: { x: 200, y: 300 } },
    });

    const deck = nextState.game.widgets.deck1 as DeckWidget;
    expect(deck.cardIds).toEqual(['c3', 'c1']);
    expect(deck.cardCount).toBe(2);

    const drawnCard = nextState.game.widgets.c2 as CardWidget;
    expect(drawnCard.x).toBe(200);
    expect(drawnCard.y).toBe(300);
    expect(drawnCard.inPile).toBe(false);
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

  it('snaps card played from hand onto a board holder (e.g. discard pile)', () => {
    const stateWithDiscard: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          playerHand: {
            ...baseState.game.widgets.playerHand,
            childIds: ['c1'],
          } as HolderWidget,
          discard: {
            id: 'discard',
            type: 'holder',
            x: 500,
            y: 300,
            width: 100,
            height: 140,
            zIndex: 5,
            childIds: [],
          } as unknown as HolderWidget,
        },
      },
    };

    // Card width is 80, height 120. Dropping at x: 510, y: 310 puts center at (550, 370), inside discard (500-600, 300-440)
    const nextState = tabletopReducer(stateWithDiscard, {
      type: 'PLAY_CARD_FROM_HAND',
      payload: { cardId: 'c1', position: { x: 510, y: 310 } },
    });

    const hand = nextState.game.widgets.playerHand as HolderWidget;
    expect(hand.childIds).not.toContain('c1');

    const discard = nextState.game.widgets.discard as HolderWidget;
    expect(discard.childIds).toContain('c1');
  });

  it('snaps card played from hand onto a deck', () => {
    const stateWithHandCard: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          playerHand: {
            ...baseState.game.widgets.playerHand,
            childIds: ['c1'],
          } as HolderWidget,
        },
      },
    };

    // deck1 is at x: 100, y: 100, width: 80, height: 120. Drop at x: 100, y: 100
    const nextState = tabletopReducer(stateWithHandCard, {
      type: 'PLAY_CARD_FROM_HAND',
      payload: { cardId: 'c1', position: { x: 100, y: 100 } },
    });

    const hand = nextState.game.widgets.playerHand as HolderWidget;
    expect(hand.childIds).not.toContain('c1');

    const deck = nextState.game.widgets.deck1 as DeckWidget;
    expect(deck.cardIds).toContain('c1');
  });

  it('does not snap a card to a hand holder or player area when played onto the board', () => {
    const stateWithHandCard: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          playerHand: {
            ...baseState.game.widgets.playerHand,
            childIds: ['c1'],
          } as HolderWidget,
        },
      },
    };

    // playerHand is at x: 200, y: 600, width: 400, height: 150.
    // Playing onto the board at x: 250, y: 620 overlaps playerHand coordinates,
    // but should NOT snap back to playerHand!
    const nextState = tabletopReducer(stateWithHandCard, {
      type: 'PLAY_CARD_FROM_HAND',
      payload: { cardId: 'c1', position: { x: 250, y: 620 } },
    });

    const hand = nextState.game.widgets.playerHand as HolderWidget;
    expect(hand.childIds).not.toContain('c1');

    const card = nextState.game.widgets.c1 as CardWidget;
    expect(card.parent).toBeUndefined();
    expect(card.x).toBe(250);
    expect(card.y).toBe(620);
  });

  it('snaps piece from supply onto a board holder', () => {
    const stateWithSupplyAndSlot: TabletopGameState = {
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
          roadA: {
            id: 'roadA',
            type: 'token',
            parent: 'Player 1 - Roads',
            width: 30,
            height: 30,
          } as unknown as CardWidget,
          boardSlot: {
            id: 'boardSlot',
            type: 'holder',
            x: 400,
            y: 400,
            width: 80,
            height: 80,
            childIds: [],
          } as unknown as HolderWidget,
        },
      },
    };

    // Drop piece at x: 420, y: 420 (inside boardSlot 400-480, 400-480)
    const nextState = tabletopReducer(stateWithSupplyAndSlot, {
      type: 'TAKE_PIECE_FROM_SUPPLY',
      payload: { pieceId: 'roadA', targetPosition: { x: 420, y: 420 } },
    });

    const supply = nextState.game.widgets['Player 1 - Roads'] as HolderWidget;
    expect(supply.childIds).not.toContain('roadA');

    const boardSlot = nextState.game.widgets.boardSlot as HolderWidget;
    expect(boardSlot.childIds).toContain('roadA');
  });

  it('remembers supplyHolderId when taken from supply and restores parent on snapping back to supply holder', () => {
    const stateWithSupply: TabletopGameState = {
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
          roadA: {
            id: 'roadA',
            type: 'token',
            label: 'Road',
            parent: 'Player 1 - Roads',
            ownerSeat: 0,
            width: 30,
            height: 30,
          } as unknown as TokenWidget,
        },
      },
    };

    // 1. Take piece from supply onto board
    const takenState = tabletopReducer(stateWithSupply, {
      type: 'TAKE_PIECE_FROM_SUPPLY',
      payload: { pieceId: 'roadA', targetPosition: { x: 300, y: 300 } },
    });

    const roadOnBoard = takenState.game.widgets.roadA;
    expect(roadOnBoard.parent).toBeUndefined();
    expect(roadOnBoard.supplyHolderId).toBe('Player 1 - Roads');
    expect(isPieceInSupplyReserve(roadOnBoard, takenState.game.widgets)).toBe(false);

    // 2. Return piece back to supply holder
    const returnedState = tabletopReducer(takenState, {
      type: 'SNAP_TO_HOLDER',
      payload: { widgetId: 'roadA', holderId: 'Player 1 - Roads' },
    });

    const roadInSupply = returnedState.game.widgets.roadA;
    expect(roadInSupply.parent).toBe('Player 1 - Roads');
    expect(isPieceInSupplyReserve(roadInSupply, returnedState.game.widgets)).toBe(true);

    const supplies = getPlayerSupplyPieces(returnedState.game.widgets, 1);
    expect(supplies['Road']).toBeDefined();
    expect(supplies['Road'].some((p) => p.id === 'roadA')).toBe(true);
  });

  it('preserves deck face-down status and marks returned cards face-down', () => {
    const stateWithFaceDownDeck: TabletopGameState = {
      ...baseState,
      game: {
        ...baseState.game,
        widgets: {
          ...baseState.game.widgets,
          deck1: {
            ...(baseState.game.widgets.deck1 as DeckWidget),
            faceUp: false,
            activeFace: 0,
          },
        },
      },
    };

    // 1. Draw card: deck stays face-down
    const drawnState = tabletopReducer(stateWithFaceDownDeck, {
      type: 'DRAW_CARD',
      payload: { deckId: 'deck1' },
    });
    const deckAfterDraw = drawnState.game.widgets.deck1 as DeckWidget;
    expect(deckAfterDraw.faceUp).toBe(false);
    expect(deckAfterDraw.activeFace).toBe(0);

    // 2. Return face-up card to deck: card becomes face-down, deck stays face-down
    const returnedState = tabletopReducer(drawnState, {
      type: 'RETURN_CARD_TO_DECK',
      payload: { cardId: 'c1', deckId: 'deck1' },
    });
    const deckAfterReturn = returnedState.game.widgets.deck1 as DeckWidget;
    const cardAfterReturn = returnedState.game.widgets.c1 as CardWidget;
    expect(deckAfterReturn.faceUp).toBe(false);
    expect(deckAfterReturn.activeFace).toBe(0);
    expect(cardAfterReturn.faceUp).toBe(false);
    expect(cardAfterReturn.activeFace).toBe(0);
  });
});
