import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { RANKS_32, makeDeck } from '../cardDeck';
import { fitsOnTop, maumau, type MauMauState } from '../maumau';
import { playRounds } from './playthrough';

const rng = seededRng(1);

const table = (over: Partial<MauMauState>): MauMauState => ({
  wins: [0, 0, 0],
  round: 1,
  phase: 'turn',
  hands: [
    ['H7', 'S8', 'DJ'],
    ['HK', 'C7', 'C9'],
    ['C8', 'S9', 'S7'],
  ],
  stock: ['DA', 'D10', 'D9'],
  discard: ['H9'],
  turn: 0,
  pendingDraw: 0,
  wishedSuit: null,
  drawn: null,
  winner: null,
  ...over,
});

describe('Mau-Mau', () => {
  it('plays random rounds with 2 to 5 players and keeps every card once', () => {
    for (const players of [2, 3, 5]) {
      for (const seed of [1, 7, 42]) {
        for (const s of playRounds(maumau, players, seed, 4) as MauMauState[]) {
          const all = [...s.hands.flat(), ...s.stock, ...s.discard];
          expect([...all].sort()).toEqual(makeDeck(RANKS_32).sort());
        }
      }
    }
  });

  it('accepts suit or rank and refuses the rest', () => {
    const s = table({});
    expect(fitsOnTop(s, 'H7')).toBe(true);
    expect(fitsOnTop(s, 'S9')).toBe(true);
    expect(fitsOnTop(s, 'S8')).toBe(false);
    expect(maumau.move(s, 0, { kind: 'cards', cards: ['S8'] }, rng)).toBe(s);
    expect(maumau.move(s, 1, { kind: 'cards', cards: ['HK'] }, rng)).toBe(s);
  });

  it('stacks sevens and makes the next seat draw the penalty', () => {
    let s = maumau.move(table({}), 0, { kind: 'cards', cards: ['H7'] }, rng);
    expect(s.pendingDraw).toBe(2);
    expect(maumau.move(s, 1, { kind: 'cards', cards: ['HK'] }, rng)).toBe(s);
    s = maumau.move(s, 1, { kind: 'cards', cards: ['C7'] }, rng);
    expect(s).toMatchObject({ pendingDraw: 4, turn: 2 });
    s = maumau.move(s, 2, { kind: 'action', id: 'penalty' }, rng);
    expect(s.hands[2]).toHaveLength(7);
    expect(s).toMatchObject({ pendingDraw: 0, turn: 0 });
  });

  it('skips the next seat after an eight', () => {
    const s = maumau.move(table({ discard: ['S10'] }), 0, { kind: 'cards', cards: ['S8'] }, rng);
    expect(s.turn).toBe(2);
  });

  it('lets a jack wish a suit for the next card', () => {
    let s = maumau.move(table({}), 0, { kind: 'cards', cards: ['DJ'] }, rng);
    expect(s.phase).toBe('wish');
    expect(maumau.view(s, 0).actions.map((a) => a.arg)).toEqual(['C', 'S', 'H', 'D']);
    s = maumau.move(s, 0, { kind: 'action', id: 'wish', arg: 'C' }, rng);
    expect(s).toMatchObject({ wishedSuit: 'C', turn: 1, phase: 'turn' });
    expect(fitsOnTop(s, 'HK')).toBe(false);
    expect(fitsOnTop(s, 'C9')).toBe(true);
  });

  it('after drawing only the drawn card may be played', () => {
    let s = maumau.move(table({ stock: ['H10'] }), 0, { kind: 'action', id: 'draw' }, rng);
    expect(s).toMatchObject({ phase: 'drawn', drawn: 'H10' });
    expect(maumau.move(s, 0, { kind: 'cards', cards: ['H7'] }, rng)).toBe(s);
    s = maumau.move(s, 0, { kind: 'cards', cards: ['H10'] }, rng);
    expect(s).toMatchObject({ phase: 'turn', turn: 1 });
  });

  it('reshuffles the discard pile under its top card when the stock is empty', () => {
    const s = maumau.move(
      table({ stock: [], discard: ['SA', 'DK', 'H9'] }),
      0,
      { kind: 'action', id: 'draw' },
      rng,
    );
    expect(s.discard).toEqual(['H9']);
    expect(s.stock).toHaveLength(1);
  });

  it('ends the round with the last card and counts the win', () => {
    const s = maumau.move(
      table({ hands: [['H7'], ['HK'], ['C8']] }),
      0,
      {
        kind: 'cards',
        cards: ['H7'],
      },
      rng,
    );
    expect(s).toMatchObject({ phase: 'roundEnd', winner: 0, wins: [1, 0, 0] });
    expect(maumau.view(s, null).summary?.rows).toHaveLength(3);
    const next = maumau.move(s, 2, { kind: 'action', id: 'next' }, rng);
    expect(next).toMatchObject({ round: 2, turn: 1, wins: [1, 0, 0] });
  });

  it('shows the table no hand and only the seat to act its buttons', () => {
    const s = table({});
    expect(maumau.view(s, null).hand).toEqual([]);
    expect(maumau.view(s, 1).actions).toEqual([]);
    expect(maumau.view(s, 0).select).toBe('one');
  });
});
