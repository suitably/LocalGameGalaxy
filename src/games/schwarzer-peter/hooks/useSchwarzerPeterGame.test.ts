import { describe, it, expect } from 'vitest';
import { initialSPStage, spStageReducer, type SPStage } from './useSchwarzerPeterGame';
import type { Card, Rank, Suit } from '../logic/types';

const c = (id: number, rank: Rank, suit: Suit): Card => ({ id, rank, suit });
const rng = () => 0.999999;

/** Deal: A 2♥ 5♣ 9♠; B 3♥ J♠ 7♣; C 4♦ 6♦ 8♣ (no pairs). */
const deck = (): Card[] => [
  c(0, '2', 'hearts'),
  c(1, '3', 'hearts'),
  c(2, '4', 'diamonds'),
  c(3, '5', 'clubs'),
  c(4, 'J', 'spades'),
  c(5, '6', 'diamonds'),
  c(6, '9', 'spades'),
  c(7, '7', 'clubs'),
  c(8, '8', 'clubs'),
];

const started = (): SPStage =>
  spStageReducer(initialSPStage, {
    type: 'start',
    playerNames: ['A', 'B', 'C'],
    deck: deck(),
    rng,
  });

describe('spStageReducer', () => {
  it('covers the first drawer after start', () => {
    expect(started().coverFor).toBe('p0');
  });

  it('keeps the cover state when an action is invalid', () => {
    const s = started();
    expect(spStageReducer(s, { type: 'act', action: { type: 'done' } })).toBe(s);
  });

  it('does not cover after a draw (the drawer sees the drawn card) and covers the next drawer after Done', () => {
    let s = spStageReducer(started(), { type: 'reveal' });
    expect(s.coverFor).toBeNull();
    s = spStageReducer(s, { type: 'act', action: { type: 'draw', index: 0 }, rng });
    expect(s.game?.phase).toBe('drawn');
    expect(s.coverFor).toBeNull();
    s = spStageReducer(s, { type: 'act', action: { type: 'done' }, rng });
    expect(s.game?.currentIndex).toBe(1);
    expect(s.coverFor).toBe('p1');
  });

  it('does not cover at round end and covers again on the next round', () => {
    // 2 players: A [2♥, J♠], B [2♦]; A takes B's only card, pairs, B out.
    const two = spStageReducer(initialSPStage, {
      type: 'start',
      playerNames: ['A', 'B'],
      deck: [c(0, '2', 'hearts'), c(1, '2', 'diamonds'), c(2, 'J', 'spades')],
      rng,
    });
    let s = spStageReducer(two, { type: 'act', action: { type: 'draw', index: 0 }, rng });
    s = spStageReducer(s, { type: 'act', action: { type: 'done' }, rng });
    expect(s.game?.phase).toBe('round_over');
    expect(s.coverFor).toBeNull();
    s = spStageReducer(s, { type: 'act', action: { type: 'next_round' }, rng });
    expect(s.game?.round).toBe(2);
    expect(s.coverFor).toBe(s.game?.players[s.game.currentIndex].id);
  });

  it('restart returns to setup', () => {
    expect(spStageReducer(started(), { type: 'restart' })).toEqual(initialSPStage);
  });
});
