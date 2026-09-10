import { describe, it, expect } from 'vitest';
import {
  getEffectiveDrawerIndex,
  getEffectiveGuesserIndex,
  getTurnPlayers,
} from './turnUtils';
import type { PlayerIdentity } from './types';

describe('turnUtils', () => {
  const p1: PlayerIdentity = { id: 'p1', name: 'Player 1' };
  const p2: PlayerIdentity = { id: 'p2', name: 'Player 2' };
  const p3: PlayerIdentity = { id: 'p3', name: 'Player 3' };

  describe('getEffectiveDrawerIndex', () => {
    it('returns explicit drawerIndex when provided and >= 0', () => {
      const game = { players: [p1, p2, p3] };
      const round = { drawerIndex: 2, drawnById: 'p1', roundNumber: 1 };
      expect(getEffectiveDrawerIndex(game, round)).toBe(2);
    });

    it('matches drawnById in player list if drawerIndex is not provided', () => {
      const game = { players: [p1, p2, p3] };
      const round = { drawnById: 'p2', roundNumber: 1 };
      expect(getEffectiveDrawerIndex(game, round)).toBe(1);
    });

    it('falls back to roundNumber formula if drawnById is not found', () => {
      const game = { players: [p1, p2, p3] };
      // Round 1 => index 0
      expect(getEffectiveDrawerIndex(game, { drawnById: 'unknown', roundNumber: 1 })).toBe(0);
      // Round 2 => index 1
      expect(getEffectiveDrawerIndex(game, { drawnById: 'unknown', roundNumber: 2 })).toBe(1);
      // Round 3 => index 2
      expect(getEffectiveDrawerIndex(game, { drawnById: 'unknown', roundNumber: 3 })).toBe(2);
    });

    it('handles round-overflow properly with modulo', () => {
      const game = { players: [p1, p2, p3] };
      // Round 4 => (4 - 1) % 3 = 0
      expect(getEffectiveDrawerIndex(game, { roundNumber: 4 })).toBe(0);
      // Round 10 => (10 - 1) % 3 = 0
      expect(getEffectiveDrawerIndex(game, { roundNumber: 10 })).toBe(0);
      // Round 11 => (11 - 1) % 3 = 1
      expect(getEffectiveDrawerIndex(game, { roundNumber: 11 })).toBe(1);
    });

    it('handles single-player games', () => {
      const game = { players: [p1] };
      expect(getEffectiveDrawerIndex(game, { roundNumber: 1 })).toBe(0);
      expect(getEffectiveDrawerIndex(game, { roundNumber: 5 })).toBe(0);
      expect(getEffectiveDrawerIndex(game, { drawnById: 'p1', roundNumber: 2 })).toBe(0);
    });

    it('handles empty players and edge-case round numbers safely', () => {
      const emptyGame = { players: [] };
      expect(getEffectiveDrawerIndex(emptyGame, { roundNumber: 1 })).toBe(0);
      expect(getEffectiveDrawerIndex(emptyGame, { roundNumber: 0 })).toBe(0);
      expect(getEffectiveDrawerIndex(emptyGame, { roundNumber: -5 })).toBe(0);

      const game = { players: [p1, p2] };
      expect(getEffectiveDrawerIndex(game, { roundNumber: 0 })).toBe(0);
      expect(getEffectiveDrawerIndex(game, { roundNumber: -1 })).toBe(0);
      expect(getEffectiveDrawerIndex(undefined, undefined)).toBe(0);
    });
  });

  describe('getEffectiveGuesserIndex', () => {
    it('returns explicit guesserIndex when provided and >= 0', () => {
      const game = { players: [p1, p2, p3] };
      const round = { guesserIndex: 0, drawerIndex: 2 };
      expect(getEffectiveGuesserIndex(game, round)).toBe(0);
    });

    it('matches guesserId in player list if guesserIndex is not provided', () => {
      const game = { players: [p1, p2, p3] };
      const round = { guesserId: 'p3', drawerIndex: 0 };
      expect(getEffectiveGuesserIndex(game, round)).toBe(2);
    });

    it('falls back to (drawerIndex + 1) % players.length', () => {
      const game = { players: [p1, p2, p3] };
      // Drawer is 0 -> Guesser is 1
      expect(getEffectiveGuesserIndex(game, { roundNumber: 1 }, 0)).toBe(1);
      // Drawer is 2 -> Guesser wraps around to 0
      expect(getEffectiveGuesserIndex(game, { roundNumber: 3 }, 2)).toBe(0);
    });

    it('handles single player games', () => {
      const game = { players: [p1] };
      expect(getEffectiveGuesserIndex(game, { roundNumber: 1 }, 0)).toBe(0);
    });
  });

  describe('getTurnPlayers', () => {
    it('resolves drawer and guesser objects and indices correctly in multi-player', () => {
      const game = { players: [p1, p2, p3] };
      const round = { drawnById: 'p1', roundNumber: 1 };

      const result = getTurnPlayers(game, round);
      expect(result.drawerIndex).toBe(0);
      expect(result.guesserIndex).toBe(1);
      expect(result.drawer).toEqual(p1);
      expect(result.guesser).toEqual(p2);
    });

    it('wraps around to first player when drawer is the last player', () => {
      const game = { players: [p1, p2, p3] };
      const round = { drawnById: 'p3', roundNumber: 3 };

      const result = getTurnPlayers(game, round);
      expect(result.drawerIndex).toBe(2);
      expect(result.guesserIndex).toBe(0);
      expect(result.drawer).toEqual(p3);
      expect(result.guesser).toEqual(p1);
    });

    it('resolves correctly for single player', () => {
      const game = { players: [p1] };
      const round = { roundNumber: 1 };

      const result = getTurnPlayers(game, round);
      expect(result.drawerIndex).toBe(0);
      expect(result.guesserIndex).toBe(0);
      expect(result.drawer).toEqual(p1);
      expect(result.guesser).toEqual(p1);
    });

    it('handles empty players safely without throwing', () => {
      const game = { players: [] };
      const round = { roundNumber: 1 };

      const result = getTurnPlayers(game, round);
      expect(result.drawerIndex).toBe(0);
      expect(result.guesserIndex).toBe(0);
      expect(result.drawer).toBeUndefined();
      expect(result.guesser).toBeUndefined();
    });

    it('handles null / undefined game and round safely', () => {
      const result = getTurnPlayers(null, null);
      expect(result.drawerIndex).toBe(0);
      expect(result.guesserIndex).toBe(0);
      expect(result.drawer).toBeUndefined();
      expect(result.guesser).toBeUndefined();
    });
  });
});
