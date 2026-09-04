import { describe, it, expect } from 'vitest';
import {
  addPlayerToLobby,
  removePlayerFromLobby,
  togglePlayerRemoteInLobby,
  normalizePlayerItem,
} from './playerLogic';

describe('Player Management Logic', () => {
  describe('normalizePlayerItem', () => {
    it('converts string to LobbyPlayerItem with defaultRemote', () => {
      expect(normalizePlayerItem('Alice', false)).toEqual({ name: 'Alice', isRemote: false });
      expect(normalizePlayerItem('  Bob  ', true)).toEqual({ name: 'Bob', isRemote: true });
    });

    it('cleans existing LobbyPlayerItem object', () => {
      expect(normalizePlayerItem({ name: ' Charlie ' })).toEqual({ name: 'Charlie', isRemote: false });
      expect(normalizePlayerItem({ name: 'David', isRemote: true })).toEqual({
        name: 'David',
        isRemote: true,
      });
    });
  });

  describe('addPlayerToLobby', () => {
    const initialPlayers = [
      { name: 'Spieler 1', isRemote: false },
      { name: 'Spieler 2', isRemote: false },
    ];

    it('adds a valid new player', () => {
      const result = addPlayerToLobby(initialPlayers, 'Spieler 3');
      expect(result.success).toBe(true);
      expect(result.players).toHaveLength(3);
      expect(result.players[2]).toEqual({ name: 'Spieler 3', isRemote: false });
    });

    it('rejects empty or whitespace-only names', () => {
      const result = addPlayerToLobby(initialPlayers, '   ');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('empty');
      expect(result.players).toEqual(initialPlayers);
    });

    it('rejects case-insensitive duplicate names', () => {
      const result1 = addPlayerToLobby(initialPlayers, 'spieler 1');
      expect(result1.success).toBe(false);
      expect(result1.reason).toBe('duplicate');

      const result2 = addPlayerToLobby(initialPlayers, 'SPIELER 2  ');
      expect(result2.success).toBe(false);
      expect(result2.reason).toBe('duplicate');
    });

    it('respects maxPlayers option', () => {
      const result = addPlayerToLobby(initialPlayers, 'Spieler 3', { maxPlayers: 2 });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('max_reached');
    });
  });

  describe('removePlayerFromLobby', () => {
    const initialPlayers = [
      { name: 'Spieler 1', isRemote: false },
      { name: 'Spieler 2', isRemote: false },
      { name: 'Spieler 3', isRemote: true },
    ];

    it('allows removing Spieler 1 and Spieler 2 down to 0 players', () => {
      // Step 1: Remove Spieler 1
      const step1 = removePlayerFromLobby(initialPlayers, 'Spieler 1');
      expect(step1).toEqual([
        { name: 'Spieler 2', isRemote: false },
        { name: 'Spieler 3', isRemote: true },
      ]);

      // Step 2: Remove Spieler 2
      const step2 = removePlayerFromLobby(step1, 'Spieler 2');
      expect(step2).toEqual([{ name: 'Spieler 3', isRemote: true }]);

      // Step 3: Remove Spieler 3 -> 0 players remaining!
      const step3 = removePlayerFromLobby(step2, 'Spieler 3');
      expect(step3).toEqual([]);
    });

    it('removes player by index', () => {
      const result = removePlayerFromLobby(initialPlayers, 1);
      expect(result).toEqual([
        { name: 'Spieler 1', isRemote: false },
        { name: 'Spieler 3', isRemote: true },
      ]);
    });

    it('handles case-insensitive and trimmed name removals', () => {
      const result = removePlayerFromLobby(initialPlayers, '  spieler 2  ');
      expect(result).toEqual([
        { name: 'Spieler 1', isRemote: false },
        { name: 'Spieler 3', isRemote: true },
      ]);
    });
  });

  describe('togglePlayerRemoteInLobby', () => {
    const initialPlayers = [
      { name: 'Alice', isRemote: false },
      { name: 'Bob', isRemote: true },
    ];

    it('toggles remote state back and forth', () => {
      const toggledAlice = togglePlayerRemoteInLobby(initialPlayers, 'alice');
      expect(toggledAlice[0].isRemote).toBe(true);

      const toggledBob = togglePlayerRemoteInLobby(initialPlayers, 'Bob');
      expect(toggledBob[1].isRemote).toBe(false);
    });
  });
});
