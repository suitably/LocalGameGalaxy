import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { makeDeck, RANKS_32 } from '../cardDeck';
import { canPass, livesAfterLoss, schwimmen, type SchwimmenState } from '../schwimmen';

const rng = seededRng(3);
const pass = { kind: 'action', id: 'pass' } as const;
const knock = { kind: 'action', id: 'knock' } as const;

const table = (over: Partial<SchwimmenState>): SchwimmenState => ({
  lives: [3, 3, 3],
  dealer: 0,
  phase: 'play',
  hands: [
    ['H7', 'S8', 'D9'],
    ['HK', 'HQ', 'C7'],
    ['C8', 'C9', 'S7'],
  ],
  extra: [],
  middle: ['HA', 'D7', 'D8'],
  stock: makeDeck(RANKS_32).slice(0, 9),
  turn: 1,
  knocker: null,
  passes: 0,
  result: null,
  rules: { passOnce: false, firstSwims: false },
  passed: [false, false, false],
  swum: false,
  ...over,
});

const actionIds = (s: SchwimmenState, seat: number) =>
  schwimmen.view(s, seat).actions.map((a) => a.id);

describe('Schwimmen deck', () => {
  it('deals from the classic 32-card deck including 7, 8 and 9', () => {
    expect(schwimmen.ranks).toEqual(['7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
    const s = schwimmen.start(3, seededRng(1));
    const dealt = [...s.hands.flat(), ...s.extra, ...s.stock];
    expect(dealt).toHaveLength(32);
  });
});

describe('Schwimmen option passOnce', () => {
  it('is off by default: passing again is allowed', () => {
    const start = schwimmen.start(3, seededRng(1));
    expect(start.rules).toEqual({ passOnce: false, firstSwims: false, newMiddle: true });
    let s = table({});
    for (const seat of [1, 2, 0, 1]) s = schwimmen.move(s, seat, pass, rng);
    expect(s.turn).toBe(2);
    expect(canPass(s, 1)).toBe(true);
  });

  it('lets each seat pass only once per deal and hides the button afterwards', () => {
    let s = table({ rules: { passOnce: true, firstSwims: false } });
    expect(actionIds(s, 1)).toContain('pass');
    for (const seat of [1, 2, 0]) s = schwimmen.move(s, seat, pass, rng);
    // Everyone passed: new middle, but nobody may pass again in this deal.
    expect(s.middle).toEqual(makeDeck(RANKS_32).slice(0, 3));
    expect(s.turn).toBe(1);
    expect(schwimmen.move(s, 1, pass, rng)).toBe(s);
    expect(actionIds(s, 1)).toEqual(['swapAll', 'knock']);
    s = schwimmen.move(s, 1, knock, rng);
    expect(schwimmen.move(s, 2, pass, rng)).toBe(s);
  });

  it('resets with the next deal and keeps the rule for the next match', () => {
    let s = table({ rules: { passOnce: true, firstSwims: false } });
    s = schwimmen.move(s, 1, pass, rng);
    s = schwimmen.move(s, 2, knock, rng);
    s = schwimmen.move(s, 0, { kind: 'cards', cards: ['H7'], target: 'D7' }, rng);
    s = schwimmen.move(s, 1, { kind: 'cards', cards: ['C7'], target: 'D8' }, rng);
    expect(s.phase).toBe('roundEnd');
    const next = schwimmen.move(s, s.dealer, { kind: 'action', id: 'next' }, rng);
    expect(next.passed).toEqual([false, false, false]);
    expect(next.rules?.passOnce).toBe(true);
    const restart = schwimmen.move(
      { ...s, phase: 'matchEnd' },
      0,
      { kind: 'action', id: 'next' },
      rng,
    );
    expect(restart.rules?.passOnce).toBe(true);
  });

  it('offers both rules as setup switches', () => {
    expect(schwimmen.options?.map((o) => o.id)).toEqual(['passOnce', 'firstSwims', 'newMiddle']);
    expect(schwimmen.start(2, seededRng(1), { passOnce: true }).rules).toEqual({
      passOnce: true,
      firstSwims: false,
      newMiddle: true,
    });
  });
});

describe('Schwimmen option firstSwims', () => {
  it('maps a lost last life to swimming, or to out once someone swam', () => {
    expect(livesAfterLoss(2, true, true)).toBe(1);
    expect(livesAfterLoss(1, false, true)).toBe(0);
    expect(livesAfterLoss(1, true, false)).toBe(0);
    expect(livesAfterLoss(1, true, true)).toBe(-1);
    expect(livesAfterLoss(0, true, true)).toBe(-1);
  });

  // Seat 0 holds the lowest hand and loses after seat 1 knocks.
  const loseRound = (s: SchwimmenState) => {
    let next = schwimmen.move(s, 1, knock, rng);
    next = schwimmen.move(next, 2, pass, rng);
    return schwimmen.move(next, 0, pass, rng);
  };

  it('off (default): everyone who loses the last life swims', () => {
    const end = loseRound(table({ lives: [1, 0, 3], swum: true }));
    expect(end.lives).toEqual([0, 0, 3]);
  });

  it('on: the first one swims and marks the match', () => {
    const end = loseRound(
      table({ lives: [1, 3, 3], rules: { passOnce: false, firstSwims: true } }),
    );
    expect(end.lives).toEqual([0, 3, 3]);
    expect(end.swum).toBe(true);
  });

  it('on: after someone swam, losing the last life means out at once', () => {
    const s = table({
      lives: [1, -1, 3],
      hands: [['H7', 'S8', 'D9'], [], ['C8', 'C9', 'S7']],
      turn: 2,
      swum: true,
      rules: { passOnce: false, firstSwims: true },
    });
    const end = schwimmen.move(schwimmen.move(s, 2, knock, rng), 0, pass, rng);
    expect(end.lives).toEqual([-1, -1, 3]);
    expect(end.phase).toBe('matchEnd');
  });

  it('keeps the swum flag across deals', () => {
    const end = loseRound(
      table({ lives: [1, 3, 3], rules: { passOnce: false, firstSwims: true } }),
    );
    const next = schwimmen.move(end, end.dealer, { kind: 'action', id: 'next' }, rng);
    expect(next.swum).toBe(true);
  });
});
