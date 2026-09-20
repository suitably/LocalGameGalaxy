import { describe, it, expect } from 'vitest';
import { processSchwimmenRound, adjustPlayerLives } from './schwimmenEngine';
import { processOhHellRound } from './ohHellEngine';
import type { CardPlayer } from './types';

describe('Schwimmen (31) Engine', () => {
  const createTestPlayers = (): CardPlayer[] => [
    { id: 'p1', name: 'Alice', lives: 3, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: 'p2', name: 'Bob', lives: 3, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: 'p3', name: 'Charlie', lives: 1, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
  ];

  it('deducts a life directly from specified loser(s)', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      losers: ['p3'],
    });

    expect(result.losers).toEqual(['p3']);
    const p3 = result.updatedPlayers.find((p) => p.id === 'p3');
    expect(p3?.lives).toBe(0);
    expect(p3?.isSwimming).toBe(true); // Charlie goes to swimming
    expect(result.isGameOver).toBe(false);
  });

  it('handles tied losers losing a life simultaneously', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      losers: ['p1', 'p2'],
    });

    expect(result.losers).toEqual(['p1', 'p2']);
    const p1 = result.updatedPlayers.find((p) => p.id === 'p1');
    const p2 = result.updatedPlayers.find((p) => p.id === 'p2');
    expect(p1?.lives).toBe(2);
    expect(p2?.lives).toBe(2);
  });

  it('causes all other players to lose a life if someone calls Blitz (blitzWinnerId)', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      blitzWinnerId: 'p1',
    });

    expect(result.isFeuer).toBe(true);
    expect(result.blitzWinnerId).toBe('p1');
    expect(result.losers).toEqual(['p2', 'p3']);
    const p1 = result.updatedPlayers.find((p) => p.id === 'p1');
    const p2 = result.updatedPlayers.find((p) => p.id === 'p2');
    const p3 = result.updatedPlayers.find((p) => p.id === 'p3');
    expect(p1?.lives).toBe(3);
    expect(p2?.lives).toBe(2);
    expect(p3?.lives).toBe(0);
    expect(p3?.isSwimming).toBe(true);
  });

  it('deducts a life from the player with the lowest score (legacy score mode)', () => {
    const players = createTestPlayers();
    const result = processSchwimmenRound(players, {
      playerScores: { p1: 30, p2: 25, p3: 20 },
    });

    expect(result.losers).toEqual(['p3']);
    const p3 = result.updatedPlayers.find((p) => p.id === 'p3');
    expect(p3?.lives).toBe(0);
    expect(p3?.isSwimming).toBe(true);
  });

  it('eliminates a swimming player when they lose again', () => {
    const players: CardPlayer[] = [
      { id: 'p1', name: 'Alice', lives: 2, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
      { id: 'p2', name: 'Bob', lives: 0, isSwimming: true, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    ];

    const result = processSchwimmenRound(players, {
      losers: ['p2'],
    });

    expect(result.losers).toEqual(['p2']);
    const p2 = result.updatedPlayers.find((p) => p.id === 'p2');
    expect(p2?.isEliminated).toBe(true);
    expect(p2?.isSwimming).toBe(false);
    expect(result.isGameOver).toBe(true);
    expect(result.winner?.id).toBe('p1');
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


describe("adjustPlayerLives", () => {
  const createTestPlayers = (): CardPlayer[] => [
    { id: "p1", name: "Alice", lives: 2, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: "p2", name: "Bob", lives: 0, isSwimming: true, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
    { id: "p3", name: "Charlie", lives: 0, isSwimming: false, isEliminated: true, score: 0, roundScores: [], bids: [], tricksWon: [] },
  ];

  describe("increasing lives (delta > 0)", () => {
    it("increments lives for active player up to default maxLives (3)", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", 1);
      const p1 = updated.find((p) => p.id === "p1");
      expect(p1?.lives).toBe(3);
    });

    it("caps active player lives at maxLives when incrementing beyond", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", 5, 3);
      const p1 = updated.find((p) => p.id === "p1");
      expect(p1?.lives).toBe(3);
    });

    it("respects custom maxLives parameter", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", 2, 5);
      const p1 = updated.find((p) => p.id === "p1");
      expect(p1?.lives).toBe(4);
    });

    it("brings a swimming player back to active status with 1 life", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p2", 1);
      const p2 = updated.find((p) => p.id === "p2");
      expect(p2?.isSwimming).toBe(false);
      expect(p2?.lives).toBe(1);
    });

    it("brings an eliminated player back to swimming status with 0 lives", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p3", 1);
      const p3 = updated.find((p) => p.id === "p3");
      expect(p3?.isEliminated).toBe(false);
      expect(p3?.isSwimming).toBe(true);
      expect(p3?.lives).toBe(0);
    });
  });

  describe("decreasing lives (delta < 0)", () => {
    it("decrements lives for active player with lives > 1", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", -1);
      const p1 = updated.find((p) => p.id === "p1");
      expect(p1?.lives).toBe(1);
      expect(p1?.isSwimming).toBe(false);
    });

    it("transitions active player with 1 life to swimming status when losing 1 life", () => {
      const players: CardPlayer[] = [
        { id: "p1", name: "Alice", lives: 1, isSwimming: false, isEliminated: false, score: 0, roundScores: [], bids: [], tricksWon: [] },
      ];
      const updated = adjustPlayerLives(players, "p1", -1);
      const p1 = updated.find((p) => p.id === "p1");
      expect(p1?.lives).toBe(0);
      expect(p1?.isSwimming).toBe(true);
      expect(p1?.isEliminated).toBe(false);
    });

    it("eliminates swimming player when losing a life", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p2", -1);
      const p2 = updated.find((p) => p.id === "p2");
      expect(p2?.isSwimming).toBe(false);
      expect(p2?.isEliminated).toBe(true);
      expect(p2?.lives).toBe(0);
    });

    it("does nothing when trying to decrease lives for an already eliminated player", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p3", -1);
      const p3 = updated.find((p) => p.id === "p3");
      expect(p3?.isEliminated).toBe(true);
      expect(p3?.isSwimming).toBe(false);
      expect(p3?.lives).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("returns unmodified players when delta is 0", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", 0);
      expect(updated).toEqual(players);
    });

    it("returns unmodified players list when playerId does not exist", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "non_existent_id", 1);
      expect(updated).toEqual(players);
    });

    it("does not mutate other players in the list", () => {
      const players = createTestPlayers();
      const updated = adjustPlayerLives(players, "p1", -1);
      const p2 = updated.find((p) => p.id === "p2");
      const p3 = updated.find((p) => p.id === "p3");
      expect(p2).toEqual(players[1]);
      expect(p3).toEqual(players[2]);
    });
  });
});
