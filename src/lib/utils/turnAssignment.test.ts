import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPlayerAssignment,
  isGameBaseSnapshotNewer,
  mergePlayerProfiles,
  hasPlayerChannelUpdates,
} from './turnAssignment';
import { storage } from '../storage';

describe('turnAssignment', () => {
  beforeEach(() => {
    storage.clear();
  });

  describe('createPlayerAssignment', () => {
    it('getLocalPlayerIds returns empty array by default', () => {
      const assignment = createPlayerAssignment('test_prefix_');
      expect(assignment.getLocalPlayerIds('game1')).toEqual([]);
    });

    it('adds and removes local player IDs', () => {
      const assignment = createPlayerAssignment('test_prefix_');
      assignment.addLocalPlayerId('game1', 'p1');
      expect(assignment.getLocalPlayerIds('game1')).toEqual(['p1']);
      assignment.addLocalPlayerId('game1', 'p2');
      expect(assignment.getLocalPlayerIds('game1')).toEqual(['p1', 'p2']);
      assignment.removeLocalPlayerId('game1', 'p1');
      expect(assignment.getLocalPlayerIds('game1')).toEqual(['p2']);
    });

    it('isPlayerLocal checks if player is in the local list', () => {
      const assignment = createPlayerAssignment('test_prefix_');
      assignment.addLocalPlayerId('game1', 'p1');
      expect(assignment.isPlayerLocal('game1', 'p1')).toBe(true);
      expect(assignment.isPlayerLocal('game1', 'p2')).toBe(false);
    });

    it('isPlayerLocal uses fallback when no local players are set', () => {
      const assignment = createPlayerAssignment('test_prefix_');
      expect(assignment.isPlayerLocal('game2', 'p1', true)).toBe(true);
      expect(assignment.isPlayerLocal('game2', 'p1', false)).toBe(false);
    });
  });

  describe('isGameBaseSnapshotNewer', () => {
    it('returns true if game name changed', () => {
      expect(isGameBaseSnapshotNewer({ name: 'A' }, { name: 'B' })).toBe(true);
    });

    it('returns true if player channels changed', () => {
      const snap = { name: 'A', players: [{ id: '1', name: 'N1', ntfyTopic: 't1' }] };
      const exist = { name: 'A', players: [{ id: '1', name: 'N1', ntfyTopic: 't2' }] };
      expect(isGameBaseSnapshotNewer(snap, exist)).toBe(true);
    });

    it('returns true if updatedAt is newer', () => {
      const snap = { name: 'A', players: [], updatedAt: new Date(2000).toISOString() };
      const exist = { name: 'A', players: [], updatedAt: new Date(1000).toISOString() };
      expect(isGameBaseSnapshotNewer(snap, exist)).toBe(true);
    });

    it('returns null if neither name, players, nor updatedAt is newer', () => {
      const snap = { name: 'A', players: [], updatedAt: new Date(1000).toISOString() };
      const exist = { name: 'A', players: [], updatedAt: new Date(2000).toISOString() };
      expect(isGameBaseSnapshotNewer(snap, exist)).toBe(null);
    });
  });

  describe('mergePlayerProfiles', () => {
    it('merges player profiles preferring local settings', () => {
      const snapshotPlayers = [{ id: 'p1', name: 'Snap', ntfyTopic: 'snap_t' }];
      const existingPlayers = [{ id: 'p1', name: 'Exist', ntfyTopic: 'exist_t' }];
      const isLocal = () => true; // local
      const merged = mergePlayerProfiles(snapshotPlayers, existingPlayers, 'game1', isLocal);
      expect(merged[0].ntfyTopic).toBe('exist_t');
      expect(merged[0].name).toBe('Snap'); // snapshot updates name
    });

    it('merges player profiles preferring remote settings if not local', () => {
      const snapshotPlayers = [{ id: 'p1', name: 'Snap', ntfyTopic: 'snap_t' }];
      const existingPlayers = [{ id: 'p1', name: 'Exist', ntfyTopic: 'exist_t' }];
      const isLocal = () => false; // not local
      const merged = mergePlayerProfiles(snapshotPlayers, existingPlayers, 'game1', isLocal);
      expect(merged[0].ntfyTopic).toBe('snap_t');
      expect(merged[0].name).toBe('Snap');
    });
  });

  describe('hasPlayerChannelUpdates', () => {
    it('returns true if remote player updated channel', () => {
      const snapshotPlayers = [{ id: 'p1', ntfyTopic: 'new_t' }];
      const existingPlayers = [{ id: 'p1', ntfyTopic: 'old_t' }];
      const isLocal = () => false;
      expect(hasPlayerChannelUpdates(snapshotPlayers, existingPlayers, 'g', isLocal)).toBe(true);
    });

    it('returns false if local player has different channel in snapshot', () => {
      const snapshotPlayers = [{ id: 'p1', ntfyTopic: 'new_t' }];
      const existingPlayers = [{ id: 'p1', ntfyTopic: 'old_t' }];
      const isLocal = () => true;
      expect(hasPlayerChannelUpdates(snapshotPlayers, existingPlayers, 'g', isLocal)).toBe(false);
    });
  });
});
