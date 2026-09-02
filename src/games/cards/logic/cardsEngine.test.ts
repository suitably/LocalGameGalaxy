import { describe, it, expect } from 'vitest';
import { processSchwimmenRound } from './schwimmenEngine';
import { processOhHellRound } from './ohHellEngine';
import type { CardPlayer } from './types';

describe('Schwimmen (31) Engine', () => {
  const createTestPlayers = (): CardPlayer[] => [
    { id: 'p1', name: 'Alice', lives: 3, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: 'p2', name: 'Bob', lives: 3, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: 'p3', name: 'Charlie', lives: 1, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
  ];

  it('deducts a life from the player with the lowest score', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      playerScores: { p1: 30, p2: 25, p3: 20 },
    });

    expect(result.losers).toEqual(['p3']);
    const p3 = result.updatedPlayers.find((p) => p.id === 'p3');
    expect(p3?.lives).toBe(0);
    expect(p3?.isSwimming).toBe(true); // Charlie goes to swimming
  });

  it('eliminates a swimming player when they lose again', () => {
    const players: CardPlayer[] = [
      { id: 'p1', name: 'Alice', lives: 2, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
      { id: 'p2', name: 'Bob', lives: 0, isSwimming: true, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    ];

    const result = processSchwimmenRound(players, {
      playerScores: { p1: 28, p2: 17 },
    });

    expect(result.losers).toEqual(['p2']);
    const p2 = result.updatedPlayers.find((p) => p.id === 'p2');
    expect(p2?.isEliminated).toBe(true);
    expect(p2?.isSwimming).toBe(false);
    expect(result.isGameOver).toBe(true);
    expect(result.winner?.id).toBe('p1');
  });

  it('causes all other players to lose a life if someone hits Feuer (33)', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      playerScores: { p1: 33, p2: 30, p3: 28 },
    });

    expect(result.isFeuer).toBe(true);
    expect(result.losers).toContain('p2');
    expect(result.losers).toContain('p3');
    expect(result.losers).not.toContain('p1');
  });
});

describe('Oh Hell / Wizard Engine', () => {
  const createOhHellPlayers = (): CardPlayer[] => [
    { id: 'p1', name: 'Alice', lives: 0, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: 'p2', name: 'Bob', lives: 0, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
  ];

  it('awards 20 bonus + 10 per trick on correct prediction', () => {
    const players = createOhHellPlayers();
    const result = processOhHellRound(players, {
      bids: { p1: 2, p2: 0 },
      tricks: { p1: 2, p2: 0 },
      cardsCount: 2,
    });

    expect(result.playerDeltas.p1).toBe(40); // 20 bonus + 2*10
    expect(result.playerDeltas.p2).toBe(20); // 20 bonus + 0*10
  });

  it('deducts 10 points per trick deviation on incorrect prediction', () => {
    const players = createOhHellPlayers();
    const result = processOhHellRound(players, {
      bids: { p1: 3, p2: 1 },
      tricks: { p1: 1, p2: 2 }, // Alice off by 2 (-20), Bob off by 1 (-10)
      cardsCount: 3,
    });

    expect(result.playerDeltas.p1).toBe(-20);
    expect(result.playerDeltas.p2).toBe(-10);
  });
});
