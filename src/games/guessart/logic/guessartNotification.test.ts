import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guessArtNotificationService } from './notificationService';
import { playerAssignment } from './playerAssignment';
import { mailboxService } from './mailboxService';
import type { GuessArtGameRecord, GuessArtRound } from './types';

import { storage } from '../../../lib/storage';

describe('GuessArt Notification & Sync Service', () => {
  const gameMock: GuessArtGameRecord = {
    id: 'game-123',
    name: 'Test Game',
    type: 'local',
    status: 'selecting',
    roundNumber: 1,
    currentPlayerIndex: 0,
    players: [
      { id: 'player-1', name: 'Alice' },
      { id: 'player-2', name: 'Bob' },
    ],
    options: {
      language: 'de',
      manualWordMode: false,
    },
    createdAt: '2026-08-30T12:00:00.000Z',
    updatedAt: '2026-08-30T12:00:00.000Z',
  };

  const roundSelectingMock: GuessArtRound = {
    id: 'round-1',
    gameId: 'game-123',
    roundNumber: 1,
    status: 'selecting',
    drawnById: 'player-1',
    drawnByName: 'Alice',
    word: '',
    wordLanguageCode: 'de',
    wordDifficulty: 1,
    translations: {},
    canvasData: '{}',
    guesses: [],
    hintLevel: 0,
    hintRequested: false,
    hintLetters: [],
    wordMask: [],
    wordLength: 0,
    createdAt: '2026-08-30T12:00:00.000Z',
    updatedAt: '2026-08-30T12:00:00.000Z',
    completedAt: null,
  };

  const roundGuessingMock: GuessArtRound = {
    ...roundSelectingMock,
    status: 'guessing',
    word: 'Katze',
    guesserId: 'player-2',
    guesserName: 'Bob',
  };

  beforeEach(() => {
    storage.clear();
  });

  describe('Turn notification decision rules', () => {
    it('does NOT notify on initial game creation or initial game start', () => {
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: gameMock,
        round: roundSelectingMock,
        isRemoteEvent: false,
        isInitialGameStart: true,
        activeGameScreenId: 'game-123',
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('initial_game_start');
    });

    it('does NOT notify when the turn transition is triggered by a local action (local handoff)', () => {
      // Local user submitted word selection or drawing
      playerAssignment.setLocalPlayerIds('game-123', ['player-1', 'player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: false,
        activeGameScreenId: 'game-123',
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('local_action_handoff');
    });

    it('does NOT notify when all players are local on the same device (pass-and-play)', () => {
      // Both Alice and Bob are local on this device
      playerAssignment.setLocalPlayerIds('game-123', ['player-1', 'player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: true,
        activeGameScreenId: 'game-123',
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('all_players_local_pass_and_play');
    });

    it('does NOT notify if the next active turn is NOT for a local player on this device', () => {
      // Alice is local, Bob is remote. Round is guessing (Bob's turn)
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('turn_not_for_local_player');
    });

    it('NOTIFIES the remote player when a remote drawing arrives and it is their turn to guess (app in background)', () => {
      // Bob is on Device B (local to Device B), Alice is on Device A (remote)
      playerAssignment.setLocalPlayerIds('game-123', ['player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: true,
        activeGameScreenId: 'game-123',
        isDocumentVisible: false, // app in background
      });

      expect(decision.shouldNotify).toBe(true);
      expect(decision.actionType).toBe('guess');
      expect(decision.activePlayerName).toBe('Bob');
    });

    it('NOTIFIES the remote player when they are in the Lobby or navigating another screen', () => {
      // Bob is on Device B (local to Device B), Alice is on Device A (remote)
      playerAssignment.setLocalPlayerIds('game-123', ['player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: true,
        activeGameScreenId: null, // in lobby or hub
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(true);
      expect(decision.actionType).toBe('guess');
      expect(decision.activePlayerName).toBe('Bob');
    });

    it('NOTIFIES the remote player when it is their turn to draw (app in background or different screen)', () => {
      // Alice is on Device A (local to Device A), Bob is on Device B (remote)
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'selecting' },
        round: roundSelectingMock,
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(true);
      expect(decision.actionType).toBe('draw');
      expect(decision.activePlayerName).toBe('Alice');
    });

    it('suppresses OS notification popup if the user is ALREADY actively watching the game in foreground', () => {
      // Bob is local, Alice is remote, Bob is actively looking at game-123 on screen
      playerAssignment.setLocalPlayerIds('game-123', ['player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'guessing' },
        round: roundGuessingMock,
        isRemoteEvent: true,
        activeGameScreenId: 'game-123',
        isDocumentVisible: true, // visible in foreground
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('already_visible_in_foreground');
    });
  });

  describe('Mailbox multi-game subscription management', () => {
    it('manages multi-game subscription IDs and active screen tracking', () => {
      mailboxService.syncSubscribedGames(['game-1', 'game-2', 'game-3']);
      mailboxService.setActiveScreenGameId('game-1');

      const listenerMock = vi.fn();
      const unsub = mailboxService.onRemoteSnapshot(listenerMock);

      expect(typeof unsub).toBe('function');
      unsub();
      mailboxService.setActiveScreenGameId(null);
    });
  });
});
