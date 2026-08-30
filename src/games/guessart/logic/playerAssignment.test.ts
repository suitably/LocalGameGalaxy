import { describe, it, expect, beforeEach } from 'vitest';
import { playerAssignment } from './playerAssignment';
import { storage } from '../../../lib/storage';

describe('playerAssignment', () => {
  const testGameId = 'game_test_123';

  beforeEach(() => {
    storage.clear();
  });

  it('correctly sets and retrieves local player IDs', () => {
    expect(playerAssignment.getLocalPlayerIds(testGameId)).toEqual([]);

    playerAssignment.setLocalPlayerIds(testGameId, ['p1', 'p2']);
    expect(playerAssignment.getLocalPlayerIds(testGameId)).toEqual(['p1', 'p2']);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p1')).toBe(true);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(true);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p3')).toBe(false);
  });

  it('adds and removes individual local player IDs without duplicates', () => {
    playerAssignment.addLocalPlayerId(testGameId, 'p1');
    playerAssignment.addLocalPlayerId(testGameId, 'p1'); // duplicate
    playerAssignment.addLocalPlayerId(testGameId, 'p2');

    expect(playerAssignment.getLocalPlayerIds(testGameId)).toEqual(['p1', 'p2']);

    playerAssignment.removeLocalPlayerId(testGameId, 'p1');
    expect(playerAssignment.getLocalPlayerIds(testGameId)).toEqual(['p2']);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p1')).toBe(false);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(true);
  });

  it('respects fallback parameter when no local players are defined', () => {
    expect(playerAssignment.isPlayerLocal('empty_game', 'p1', true)).toBe(true);
    expect(playerAssignment.isPlayerLocal('empty_game', 'p1', false)).toBe(false);
  });
});
