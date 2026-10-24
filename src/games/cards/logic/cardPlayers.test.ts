import { describe, it, expect } from 'vitest';
import {
  createCardPlayers,
  formatSignedPoints,
  parseCountInput,
  rankPlayersByScore,
  sumCountInputs,
  toCountMap,
} from './cardPlayers';

describe('cardPlayers', () => {
  it('creates players with sequential ids and the given lives', () => {
    const players = createCardPlayers(['Ann', 'Ben'], 3);
    expect(players.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(players[1]).toMatchObject({ name: 'Ben', lives: 3, score: 0, isEliminated: false });
    expect(createCardPlayers(['Ann'])[0].lives).toBe(0);
  });

  it('ranks by score descending without mutating the input', () => {
    const players = createCardPlayers(['A', 'B', 'C']);
    players[1].score = 10;
    players[2].score = 5;
    expect(rankPlayersByScore(players).map((p) => p.name)).toEqual(['B', 'C', 'A']);
    expect(players.map((p) => p.name)).toEqual(['A', 'B', 'C']);
  });

  it('keeps tied players in seat order', () => {
    const players = createCardPlayers(['A', 'B']);
    expect(rankPlayersByScore(players).map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('formats signed points', () => {
    expect(formatSignedPoints(5)).toBe('+5');
    expect(formatSignedPoints(0)).toBe('+0');
    expect(formatSignedPoints(-3)).toBe('-3');
  });

  it('parses count inputs leniently', () => {
    expect(parseCountInput('4')).toBe(4);
    expect(parseCountInput('')).toBe(0);
    expect(parseCountInput('x')).toBe(0);
    expect(parseCountInput(undefined)).toBe(0);
  });

  it('sums inputs and builds count maps for all players', () => {
    const players = createCardPlayers(['A', 'B', 'C']);
    expect(sumCountInputs({ p1: '2', p2: '', p3: '3' })).toBe(5);
    expect(toCountMap(players, { p1: '2' })).toEqual({ p1: 2, p2: 0, p3: 0 });
  });
});
