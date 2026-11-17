import { describe, it, expect } from 'vitest';
import {
  caboStageReducer,
  initialCaboStage,
  needsStartPeek,
  type CaboStage,
  type CaboStageAction,
} from './useCaboGame';
import type { Card, Rank, Suit } from '../logic/types';

const c = (id: number, rank: Rank, suit: Suit | null = 'clubs'): Card => ({ id, rank, suit });

/** No powers on the draw pile (Ann draws 4♣, Ben 2♦, ...), so a turn is draw + discard. */
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

const step = (stage: CaboStage, ...actions: CaboStageAction[]) =>
  actions.reduce(caboStageReducer, stage);

const start = (): CaboStage =>
  step(initialCaboStage, {
    type: 'start',
    playerNames: ['Ann', 'Ben'],
    options: { deck: plainDeck() },
  });

/** Reveal the cover and acknowledge the start peek for the current player. */
const ready = (stage: CaboStage) => step(stage, { type: 'reveal' }, { type: 'ack_start_peek' });

const draw: CaboStageAction = { type: 'act', action: { type: 'draw', source: 'deck' } };
const discard: CaboStageAction = { type: 'act', action: { type: 'discard_drawn' } };

describe('caboStageReducer', () => {
  it('starts with the cover for the first player and a pending start peek', () => {
    const stage = start();
    expect(stage.coverFor).toBe('p1');
    expect(needsStartPeek(step(stage, { type: 'reveal' }))).toBe(true);
  });

  it('ignores actions while covered or before the start peek', () => {
    const covered = start();
    expect(step(covered, draw)).toBe(covered);
    const peeking = step(covered, { type: 'reveal' });
    expect(step(peeking, draw)).toBe(peeking);
    expect(step(ready(covered), draw).game?.phase).toBe('drawn');
  });

  it('keeps the cover off while the same player keeps acting', () => {
    const stage = step(ready(start()), draw);
    expect(stage.coverFor).toBeNull();
  });

  it('covers for the next player when the turn ends, who then peeks too', () => {
    const stage = step(ready(start()), draw, discard);
    expect(stage.game?.currentIndex).toBe(1);
    expect(stage.coverFor).toBe('p2');
    expect(needsStartPeek(step(stage, { type: 'reveal' }))).toBe(true);
  });

  it('ignores illegal actions', () => {
    const stage = ready(start());
    expect(step(stage, { type: 'act', action: { type: 'swap', slot: 0 } })).toBe(stage);
  });

  it('resets the start peek and covers the first player of the next round', () => {
    let stage = step(ready(start()), { type: 'act', action: { type: 'call_cabo' } });
    stage = step(ready(stage), draw, discard);
    expect(stage.game?.phase).toBe('round_over');
    expect(stage.coverFor).toBeNull();

    stage = step(stage, { type: 'act', action: { type: 'next_round' } });
    expect(stage.game?.roundNumber).toBe(2);
    expect(stage.coverFor).toBe('p2');
    expect(stage.startPeekSeen).toEqual([]);
  });

  it('passes the memory aid option to the game and restarts to setup', () => {
    const stage = step(initialCaboStage, {
      type: 'start',
      playerNames: ['Ann', 'Ben'],
      options: { memoryAid: true },
    });
    expect(stage.game?.memoryAid).toBe(true);
    expect(step(stage, { type: 'restart' })).toEqual(initialCaboStage);
  });
});
