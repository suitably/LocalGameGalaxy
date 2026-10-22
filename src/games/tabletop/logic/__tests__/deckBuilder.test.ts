import { describe, it, expect } from 'vitest';
import {
  buildDeck,
  facesFromImageList,
  facesFromSpritesheet,
  MAX_DECK_CARDS,
} from '../deckBuilder';
import { tabletopReducer } from '../tabletopReducer';
import type { CardWidget, DeckWidget } from '../types';

describe('deckBuilder (#449)', () => {
  it('reads one face per non-empty line', () => {
    expect(facesFromImageList('a.png\n\n  b.png  \r\n')).toEqual([
      { type: 'image', value: 'a.png' },
      { type: 'image', value: 'b.png' },
    ]);
  });

  it('cuts a spritesheet row by row and caps the count', () => {
    const faces = facesFromSpritesheet('s.png', 3, 2, 4);
    expect(faces.map((f) => [f.spriteSheet?.col, f.spriteSheet?.row])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ]);
    expect(facesFromSpritesheet('s.png', 3, 2, 99)).toHaveLength(6);
    expect(facesFromSpritesheet('s.png', 100, 100)).toHaveLength(MAX_DECK_CARDS);
  });

  it('builds a deck of face-down cards that can be drawn', () => {
    const widgets = buildDeck({
      deckId: 'd',
      x: 10,
      y: 20,
      zIndex: 5,
      width: 80,
      height: 120,
      faces: facesFromImageList('a\nb'),
    });
    const [deck, ...cards] = widgets as [DeckWidget, ...CardWidget[]];
    expect(deck).toMatchObject({ id: 'd', type: 'deck', cardIds: ['d_c1', 'd_c2'], cardCount: 2 });
    expect(cards.every((c) => c.inPile && !c.faceUp && c.pileId === 'd')).toBe(true);

    const game = {
      id: 'g',
      name: 'G',
      version: '1',
      minPlayers: 1,
      maxPlayers: 2,
      supportedModes: ['local_pass_and_play' as const],
      table: { width: 800, height: 600 },
      widgets: {},
    };
    let state = tabletopReducer(
      { game, flyingCards: [] },
      { type: 'ADD_WIDGETS', payload: { widgets } },
    );
    expect(Object.keys(state.game.widgets)).toHaveLength(3);
    state = tabletopReducer(state, {
      type: 'DRAW_CARD',
      payload: { deckId: 'd', position: { x: 0, y: 0 } },
    });
    expect((state.game.widgets.d as DeckWidget).cardIds).toHaveLength(1);
  });
});
