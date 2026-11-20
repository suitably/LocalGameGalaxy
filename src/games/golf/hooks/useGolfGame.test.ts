import { describe, it, expect } from 'vitest';
import { golfStageReducer, initialGolfStage, type GolfStage } from './useGolfGame';
import type { Card, Rank } from '../logic/types';

const deck = (): Card[] =>
  (['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A', '2', '3', '4', 'K', 'Q'] as Rank[])
    .map((rank, id) => ({ id, rank, suit: 'clubs' as const }))
    .reverse();

const start = (): GolfStage =>
  golfStageReducer(initialGolfStage, { type: 'start', playerNames: ['Ann', 'Ben'], deck: deck() });

describe('golfStageReducer', () => {
  it('starts a game without a cover', () => {
    const stage = start();
    expect(stage.game?.players).toHaveLength(2);
    expect(stage.game?.phase).toBe('flip_start');
  });

  it('applies legal actions and ignores illegal ones', () => {
    const stage = start();
    const flipped = golfStageReducer(stage, {
      type: 'act',
      action: { type: 'flip_start', slot: 0 },
    });
    expect(flipped.game?.players[0].faceUp[0]).toBe(true);
    expect(golfStageReducer(stage, { type: 'act', action: { type: 'draw', source: 'deck' } })).toBe(
      stage,
    );
  });

  it('ignores actions without a game and restarts to the setup', () => {
    expect(
      golfStageReducer(initialGolfStage, { type: 'act', action: { type: 'next_round' } }),
    ).toBe(initialGolfStage);
    expect(golfStageReducer(start(), { type: 'restart' })).toBe(initialGolfStage);
  });
});
