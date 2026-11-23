import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { gridScore, golf, type GolfState } from '../golf';
import { playRounds } from './playthrough';

const rng = seededRng(9);
const down = () => Array<boolean>(6).fill(false);

const table = (over: Partial<GolfState>): GolfState => ({
  totals: [0, 0],
  hole: 1,
  grids: [
    ['H5', 'S9', 'DK', 'C5', 'H2', 'X1'],
    ['HA', 'SA', 'D3', 'C4', 'H6', 'S7'],
  ],
  up: [down(), down()],
  stock: ['D9', 'C10'],
  discard: ['SQ'],
  phase: 'turn',
  turn: 0,
  startFlips: 0,
  drawn: null,
  closer: null,
  lastTurns: 0,
  scores: null,
  ...over,
});

describe('Golf', () => {
  it('scores columns: equal ranks zero, jokers never pair', () => {
    expect(gridScore(['H5', 'S9', 'DK', 'C5', 'H2', 'X1'])).toBe(0 + 9 + 2 + 0 - 2);
    expect(gridScore(['X1', 'S9', 'DQ', 'X2', 'H9~2', 'CQ'])).toBe(-4 + 0 + 0);
  });

  it('plays random holes with 2 to 6 players and keeps every card once', () => {
    for (const players of [2, 4, 5, 6]) {
      for (const seed of [1, 42]) {
        for (const s of playRounds(golf, players, seed, 3) as GolfState[]) {
          const all = [
            ...s.grids.flat(),
            ...s.stock,
            ...s.discard,
            ...(s.drawn ? [s.drawn.card] : []),
          ];
          expect(new Set(all).size).toBe(all.length);
          expect(all).toHaveLength(players <= 4 ? 54 : 108);
        }
      }
    }
  });

  it('starts with two flips per seat on face-down slots of the own grid', () => {
    let s = table({ phase: 'flip' });
    expect(golf.view(s, 0).slotTargets).toHaveLength(6);
    expect(golf.view(s, 1).slotTargets).toEqual([]);
    expect(golf.move(s, 0, { kind: 'slot', seat: 1, slot: 0 }, rng)).toBe(s);
    s = golf.move(s, 0, { kind: 'slot', seat: 0, slot: 0 }, rng);
    expect(golf.move(s, 0, { kind: 'slot', seat: 0, slot: 0 }, rng)).toBe(s);
    s = golf.move(s, 0, { kind: 'slot', seat: 0, slot: 1 }, rng);
    expect(s).toMatchObject({ turn: 1, phase: 'flip' });
    expect(golf.view(s, 1).seats[0].slots).toEqual(['H5', 'S9', null, null, null, null]);
  });

  it('swaps a drawn card in and puts the old one face up on the discard', () => {
    let s = golf.move(table({}), 0, { kind: 'action', id: 'takeDiscard' }, rng);
    expect(golf.move(s, 0, { kind: 'action', id: 'discard' }, rng)).toBe(s);
    s = golf.move(s, 0, { kind: 'slot', seat: 0, slot: 2 }, rng);
    expect(s.grids[0][2]).toBe('SQ');
    expect(s.discard).toEqual(['DK']);
    expect(s).toMatchObject({ turn: 1, phase: 'turn' });
  });

  it('after discarding a stock card the seat flips one face-down card', () => {
    let s = golf.move(table({}), 0, { kind: 'action', id: 'drawStock' }, rng);
    s = golf.move(s, 0, { kind: 'action', id: 'discard' }, rng);
    expect(s.phase).toBe('flipAfter');
    s = golf.move(s, 0, { kind: 'slot', seat: 0, slot: 4 }, rng);
    expect(s.up[0][4]).toBe(true);
    expect(s.turn).toBe(1);
  });

  it('gives everyone one more turn after a full grid, then scores the hole', () => {
    const allUp = [true, true, true, true, true, false];
    let s = table({ up: [allUp, down()] });
    s = golf.move(s, 0, { kind: 'action', id: 'drawStock' }, rng);
    s = golf.move(s, 0, { kind: 'slot', seat: 0, slot: 5 }, rng);
    expect(s).toMatchObject({ closer: 0, turn: 1, phase: 'turn' });
    s = golf.move(s, 1, { kind: 'action', id: 'drawStock' }, rng);
    s = golf.move(s, 1, { kind: 'slot', seat: 1, slot: 0 }, rng);
    expect(s.phase).toBe('holeEnd');
    expect(s.totals).toEqual(s.scores);
    expect(golf.view(s, null).summary?.rows).toHaveLength(2);
  });
});
