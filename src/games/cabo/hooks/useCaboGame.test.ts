import { describe, it, expect } from 'vitest';
import { caboStageReducer, initialCaboStage, type CaboStage } from './useCaboGame';
import type { Card, Rank, Suit } from '../logic/types';

const c = (id: number, rank: Rank, suit: Suit | null = 'clubs'): Card => ({ id, rank, suit });

/**
 * Fixed deck with no powers on the draw pile (Ann draws 4♣, Ben draws 2♦, ...), so turns end
 * after one draw and one discard. Dealing and draw order follow the array; the deck is reversed
 * because the top of the deck is the last element.
 */
const plainDeck = (): Card[] =>
  [
    c(0, '2'),
    c(1, '3'),
    c(2, '4'),
    c(3, '5'),
    c(4, '6'),
    c(5, 'A'),
    c(6, '2'),
    c(7, '3'),
    c(8, '6', 'diamonds'),
    c(9, '4', 'clubs'),
    c(10, '2', 'diamonds'),
    c(11, 'A', 'hearts'),
  ].reverse();

const start = (): CaboStage =>
  caboStageReducer(initialCaboStage, {
    type: 'start',
    playerNames: ['Ann', 'Ben'],
    deck: plainDeck(),
  });

const act = (stage: CaboStage, action: Parameters<typeof caboStageReducer>[1]) =>
  caboStageReducer(stage, action);

describe('caboStageReducer (pass-and-play cover)', () => {
  it('starts a game with the cover for the first player', () => {
    const stage = start();
    expect(stage.game?.players).toHaveLength(2);
    expect(stage.coverFor).toBe('p1');
  });

  it('keeps the cover off while the same player keeps acting', () => {
    let stage = act(start(), { type: 'reveal' });
    stage = act(stage, { type: 'act', action: { type: 'draw', source: 'deck' } });
    expect(stage.game?.phase).toBe('drawn');
    expect(stage.coverFor).toBeNull();
  });

  it('shows the cover for the next player when the turn ends', () => {
    let stage = act(start(), { type: 'reveal' });
    stage = act(stage, { type: 'act', action: { type: 'draw', source: 'deck' } });
    stage = act(stage, { type: 'act', action: { type: 'discard_drawn' } });
    expect(stage.game?.currentIndex).toBe(1);
    expect(stage.coverFor).toBe('p2');
  });

  it('ignores illegal actions without touching the cover', () => {
    const stage = act(start(), { type: 'reveal' });
    const after = act(stage, { type: 'act', action: { type: 'swap', slot: 0 } });
    expect(after).toBe(stage);
  });

  it('shows the cover for the first player of the next round', () => {
    // Ann calls Cabo; Ben plays the last turn and the round ends.
    let stage = act(start(), { type: 'reveal' });
    stage = act(stage, { type: 'act', action: { type: 'call_cabo' } });
    stage = act(stage, { type: 'reveal' });
    stage = act(stage, { type: 'act', action: { type: 'draw', source: 'deck' } });
    stage = act(stage, { type: 'act', action: { type: 'discard_drawn' } });
    expect(stage.game?.phase).toBe('round_over');
    expect(stage.coverFor).toBeNull();

    stage = act(stage, { type: 'act', action: { type: 'next_round' } });
    expect(stage.game?.roundNumber).toBe(2);
    expect(stage.coverFor).toBe('p2');
  });

  it('restarts back to the empty setup state', () => {
    const stage = act(start(), { type: 'restart' });
    expect(stage).toEqual(initialCaboStage);
  });
});
