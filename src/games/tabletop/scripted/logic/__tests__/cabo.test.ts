import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { cabo, cardValue, type CaboState } from '../cabo';
import { playRounds } from './playthrough';

const rng = seededRng(4);
const slot = (seat: number, n: number) => ({ kind: 'slot' as const, seat, slot: n });
const act = (id: string) => ({ kind: 'action' as const, id });

const table = (over: Partial<CaboState>): CaboState => ({
  totals: [0, 0, 0],
  round: 1,
  hands: [
    ['HA', 'S2', 'DK', 'C3'],
    ['H9', 'S9', 'CK', 'X1'],
    ['D5', 'D6', 'D7', 'D8'],
  ],
  stock: ['H7', 'CQ', 'S10'],
  discard: ['H4'],
  phase: 'turn',
  turn: 0,
  peeked: 3,
  drawn: null,
  power: null,
  swapFrom: null,
  revealed: null,
  caller: null,
  result: null,
  ...over,
});

describe('Cabo', () => {
  it('values: red king 0, black king 13, joker 0', () => {
    expect(['HA', 'S10', 'DJ', 'CQ', 'HK', 'SK', 'X2'].map(cardValue)).toEqual([
      1, 10, 11, 12, 0, 13, 0,
    ]);
  });

  it('plays random rounds with 2 to 6 players and keeps every card once', () => {
    for (const players of [2, 4, 6]) {
      for (const seed of [1, 42]) {
        for (const s of playRounds(cabo, players, seed, 3) as CaboState[]) {
          const all = [
            ...s.hands.flat(),
            ...s.stock,
            ...s.discard,
            ...(s.drawn ? [s.drawn.card] : []),
          ];
          expect(new Set(all).size).toBe(54);
          expect(all).toHaveLength(54);
        }
      }
    }
  });

  it('shows only the bottom two to the peeking seat, then everyone peeks in turn', () => {
    let s = table({ phase: 'peek', peeked: 0 });
    expect(cabo.view(s, 0).seats[0].slots).toEqual([null, null, 'DK', 'C3']);
    expect(cabo.view(s, 1).seats[0].slots).toEqual([null, null, null, null]);
    expect(cabo.view(s, 1).seats[1].slots).toEqual([null, null, null, null]);
    for (const seat of [0, 1, 2]) s = cabo.move(s, seat, act('seen'), rng);
    expect(s).toMatchObject({ phase: 'turn', turn: 0 });
    expect(cabo.view(s, 0).seats[0].slots).toEqual([null, null, null, null]);
  });

  it('keeps a stock card secret from the others and swaps it in', () => {
    let s = cabo.move(table({}), 0, act('drawStock'), rng);
    expect(cabo.view(s, 0).piles.find((p) => p.id === 'drawn')?.cards).toEqual([{ id: 'H7' }]);
    expect(cabo.view(s, 1).piles.find((p) => p.id === 'drawn')?.cards).toEqual([]);
    s = cabo.move(s, 0, slot(0, 1), rng);
    expect(s.hands[0][1]).toBe('H7');
    expect(s.discard).toEqual(['H4', 'S2']);
    expect(s.turn).toBe(1);
  });

  it('a discarded 7 lets the seat look at one own card until it ends the turn', () => {
    let s = cabo.move(table({}), 0, act('drawStock'), rng);
    s = cabo.move(s, 0, act('discard'), rng);
    expect(s).toMatchObject({ phase: 'power', power: 'peekOwn' });
    expect(cabo.move(s, 0, slot(1, 0), rng)).toBe(s);
    s = cabo.move(s, 0, slot(0, 0), rng);
    expect(cabo.view(s, 0).seats[0].slots).toEqual(['HA', null, null, null]);
    expect(cabo.view(s, 1).seats[0].slots).toEqual([null, null, null, null]);
    s = cabo.move(s, 0, act('endTurn'), rng);
    expect(s.turn).toBe(1);
  });

  it('a discarded queen blind-swaps an own card with another seat', () => {
    let s = cabo.move(table({ stock: ['CQ'] }), 0, act('drawStock'), rng);
    s = cabo.move(s, 0, act('discard'), rng);
    s = cabo.move(s, 0, slot(0, 3), rng);
    expect(s.swapFrom).toBe(3);
    s = cabo.move(s, 0, slot(2, 0), rng);
    expect(s.hands[0][3]).toBe('D5');
    expect(s.hands[2][0]).toBe('C3');
    expect(s.turn).toBe(1);
  });

  it('after Cabo the others play once, then the caller gets +10 unless strictly lowest', () => {
    let s = cabo.move(table({}), 0, act('cabo'), rng);
    expect(s).toMatchObject({ caller: 0, turn: 1 });
    s = cabo.move(s, 1, act('takeDiscard'), rng);
    s = cabo.move(s, 1, slot(1, 0), rng);
    s = cabo.move(s, 2, act('takeDiscard'), rng);
    s = cabo.move(s, 2, slot(2, 0), rng);
    // Seat 0: 1+2+0+3 = 6; seat 1: 4+9+13+0 = 26; seat 2: 9+6+7+8 = 30.
    expect(s).toMatchObject({ phase: 'roundEnd', totals: [6, 26, 30] });
    expect(s.result?.penalty).toBe(false);
  });

  it('a total of exactly 100 falls back to 50', () => {
    let s = cabo.move(table({ totals: [94, 0, 0] }), 0, act('cabo'), rng);
    s = cabo.move(s, 1, act('takeDiscard'), rng);
    s = cabo.move(s, 1, slot(1, 0), rng);
    s = cabo.move(s, 2, act('takeDiscard'), rng);
    s = cabo.move(s, 2, slot(2, 0), rng);
    expect(s.totals[0]).toBe(50);
    expect(s.result?.resets).toEqual([0]);
  });
});
