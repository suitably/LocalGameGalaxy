import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { RANKS_52, makeDeck } from '../cardDeck';
import {
  PETER,
  isPair,
  schwarzerPeter,
  withoutPairs,
  type SchwarzerPeterState,
} from '../schwarzerPeter';
import { playRounds } from './playthrough';

const rng = seededRng(3);

const table = (over: Partial<SchwarzerPeterState>): SchwarzerPeterState => ({
  losses: [0, 0, 0],
  round: 1,
  hands: [['H7', 'C9'], ['D7', 'S5'], [PETER]],
  pairs: 0,
  turn: 0,
  source: 1,
  phase: 'draw',
  drawn: null,
  loser: null,
  ...over,
});

describe('Schwarzer Peter', () => {
  it('pairs same rank and colour, never the Peter', () => {
    expect(isPair('H7', 'D7')).toBe(true);
    expect(isPair('H7', 'S7')).toBe(false);
    expect(isPair('SJ', 'CJ')).toBe(false);
    expect(withoutPairs(['H7', 'S9', 'D7', 'C9', 'H2'])).toEqual({ hand: ['H2'], down: 4 });
  });

  it('plays random rounds with 2 to 6 players and keeps 51 cards', () => {
    const deck = makeDeck(RANKS_52).filter((c) => c !== 'CJ');
    for (const players of [2, 4, 6]) {
      for (const seed of [1, 7, 42]) {
        for (const s of playRounds(schwarzerPeter, players, seed, 3) as SchwarzerPeterState[]) {
          expect(s.hands.flat().length + s.pairs).toBe(deck.length);
          expect(new Set(s.hands.flat()).size).toBe(s.hands.flat().length);
        }
      }
    }
  });

  it('lets only the drawer pick a face-down card of the source', () => {
    const s = table({});
    const drawer = schwarzerPeter.view(s, 0);
    expect(drawer.slotTargets).toEqual([
      { seat: 1, slot: 0 },
      { seat: 1, slot: 1 },
    ]);
    expect(drawer.seats[1].slots).toEqual([null, null]);
    expect(schwarzerPeter.view(s, 1).seats[1].slots).toBeUndefined();
    expect(schwarzerPeter.view(s, 2).slotTargets).toEqual([]);
    expect(schwarzerPeter.move(s, 2, { kind: 'slot', seat: 1, slot: 0 }, rng)).toBe(s);
    expect(schwarzerPeter.move(s, 0, { kind: 'slot', seat: 2, slot: 0 }, rng)).toBe(s);
  });

  it('discards a drawn pair and passes the turn on', () => {
    let s = schwarzerPeter.move(table({}), 0, { kind: 'slot', seat: 1, slot: 0 }, rng);
    expect(s).toMatchObject({ phase: 'drawn', drawn: { card: 'D7', pair: 'H7' }, pairs: 2 });
    expect(s.hands).toEqual([['C9'], ['S5'], [PETER]]);
    s = schwarzerPeter.move(s, 0, { kind: 'action', id: 'done' }, rng);
    expect(s).toMatchObject({ phase: 'draw', turn: 1, source: 2 });
  });

  it('ends the round on the Peter holder and counts the loss', () => {
    let s = table({ hands: [['H7'], ['D7'], [PETER]], source: 1 });
    s = schwarzerPeter.move(s, 0, { kind: 'slot', seat: 1, slot: 0 }, rng);
    s = schwarzerPeter.move(s, 0, { kind: 'action', id: 'done' }, rng);
    expect(s).toMatchObject({ phase: 'roundEnd', loser: 2, losses: [0, 0, 1] });
    expect(schwarzerPeter.view(s, null).summary?.rows[2]).toMatchObject({ tone: 'bad' });
  });
});
