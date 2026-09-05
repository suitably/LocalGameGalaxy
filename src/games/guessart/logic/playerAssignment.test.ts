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

  it('preserves remote player ID on the remote device and only purges foreign ntfy topics', () => {
    const ownTopic = 'lgg-user-deviceB';
    storage.setUserNtfyTopic(ownTopic);

    // Device B is playing as p2 (which is isRemote: true in game)
    playerAssignment.setLocalPlayerIds(testGameId, ['p2']);

    const remoteSnapshotPlayers = [
      { id: 'p1', name: 'Host', isRemote: false, ntfyTopic: 'lgg-user-deviceA' },
      { id: 'p2', name: 'Guest', isRemote: true, ntfyTopic: ownTopic },
    ];

    // Purge simulation as executed in useGuessArtGame onRemoteSnapshot
    for (const p of remoteSnapshotPlayers) {
      if (p.ntfyTopic && p.ntfyTopic !== ownTopic) {
        playerAssignment.removeLocalPlayerId(testGameId, p.id);
      }
    }

    // p2 must STILL be local on Device B!
    expect(playerAssignment.getLocalPlayerIds(testGameId)).toEqual(['p2']);
    expect(playerAssignment.isPlayerLocal(testGameId, 'p2', false)).toBe(true);
  });

  describe('temporary claims', () => {
    it('claims a turn temporarily and releases it for a specific player', () => {
      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p2')).toBe(false);
      expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(false);

      playerAssignment.claimTurnTemporary(testGameId, 'p2');
      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p2')).toBe(true);
      expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(true);

      playerAssignment.releaseTemporaryClaims(testGameId, 'p2');
      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p2')).toBe(false);
      expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(false);
    });

    it('releases all temporary claims when no specific player is passed', () => {
      playerAssignment.claimTurnTemporary(testGameId, 'p2');
      playerAssignment.claimTurnTemporary(testGameId, 'p3');

      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p2')).toBe(true);
      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p3')).toBe(true);

      playerAssignment.releaseTemporaryClaims(testGameId);

      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p2')).toBe(false);
      expect(playerAssignment.isTurnClaimedTemporarily(testGameId, 'p3')).toBe(false);
      expect(playerAssignment.isPlayerLocal(testGameId, 'p2')).toBe(false);
      expect(playerAssignment.isPlayerLocal(testGameId, 'p3')).toBe(false);
    });
  });
});
