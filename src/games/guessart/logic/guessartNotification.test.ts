import { describe, it, expect, beforeEach } from 'vitest';
import { guessArtNotificationService } from './notificationService';
import { playerAssignment } from './playerAssignment';
import { isSnapshotNewer } from './engine';
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

    it('does NOT notify round 1 drawer to draw on initial setup even if remote presence arrives', () => {
      // Alice is on Device A (Host), Bob is on Device B (remote)
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'selecting' },
        round: roundSelectingMock, // roundNumber === 1
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('round_1_drawer_setup');
    });

    it('NOTIFIES the player when it is their turn to draw in subsequent rounds (app in background or different screen)', () => {
      // Alice is on Device A (local to Device A), Bob is on Device B (remote)
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const round2SelectingMock: GuessArtRound = {
        ...roundSelectingMock,
        id: 'round-2',
        roundNumber: 2,
        drawnById: 'player-1',
        drawnByName: 'Alice',
      };

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'selecting', roundNumber: 2 },
        round: round2SelectingMock,
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

    it('does NOT notify while drawing is actively in progress', () => {
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'drawing' },
        round: { ...roundSelectingMock, status: 'drawing', word: 'Katze' },
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: true,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('no_active_player');
    });

    it('suppresses guess notification if the active guesser is the drawer themselves', () => {
      // Alice (player-1) is both drawer and somehow active guesser (prevent self-guess)
      playerAssignment.setLocalPlayerIds('game-123', ['player-1']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: {
          ...gameMock,
          status: 'guessing',
          players: [
            { id: 'player-1', name: 'Alice' },
            { id: 'player-2', name: 'Bob' },
          ],
        },
        round: {
          ...roundGuessingMock,
          drawnById: 'player-1',
          guesserId: 'player-1', // active guesser is drawer
        },
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('drawing_drawn_by_same_player');
    });

    it('allows turn notification for a second local player when another local player drew the picture', () => {
      // Alice (player-1) drew. Bob (player-2) is guesser. Both are local on Host. Charlie is remote.
      const game3Mock: GuessArtGameRecord = {
        ...gameMock,
        players: [
          { id: 'player-1', name: 'Alice' },
          { id: 'player-2', name: 'Bob' },
          { id: 'player-3', name: 'Charlie' },
        ],
      };
      playerAssignment.setLocalPlayerIds('game-123', ['player-1', 'player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...game3Mock, status: 'guessing' },
        round: roundGuessingMock, // drawnById: 'player-1', guesser: 'player-2'
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(true);
      expect(decision.activePlayerName).toBe('Bob');
      expect(decision.actionType).toBe('guess');
    });

    it('suppresses notification if the round is marked with temporaryClaim', () => {
      // Remote player Bob receives round marked as temporaryClaim (played on Host device)
      playerAssignment.setLocalPlayerIds('game-123', ['player-2']);

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'selecting', roundNumber: 2 },
        round: {
          ...roundSelectingMock,
          id: 'round-2',
          roundNumber: 2,
          drawnById: 'player-2',
          temporaryClaim: true,
        },
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('turn_claimed_temporarily');
    });

    it('suppresses notification if the active player is claimed temporarily on this device', () => {
      playerAssignment.claimTurnTemporary('game-123', 'player-2');

      const decision = guessArtNotificationService.evaluateTurnNotification({
        game: { ...gameMock, status: 'selecting', roundNumber: 2 },
        round: {
          ...roundSelectingMock,
          id: 'round-2',
          roundNumber: 2,
          drawnById: 'player-2',
        },
        isRemoteEvent: true,
        activeGameScreenId: null,
        isDocumentVisible: false,
      });

      expect(decision.shouldNotify).toBe(false);
      expect(decision.reason).toBe('turn_claimed_temporarily');
    });
  });

  describe('Snapshot import and drawing data preservation', () => {
    it('correctly identifies incoming snapshot with drawing data as newer', () => {
      const blankExistingRound = {
        ...roundGuessingMock,
        canvasData: '{}',
      };
      const snapWithDrawing = {
        game: { ...gameMock, status: 'guessing' as const },
        round: {
          ...roundGuessingMock,
          canvasData: JSON.stringify({ elements: [{ id: 'elem1', type: 'freedraw' }] }),
        },
      };

      const isNewer = isSnapshotNewer(snapWithDrawing, gameMock, blankExistingRound);
      expect(isNewer).toBe(true);
    });

    it('correctly identifies incoming round with word as newer', () => {
      const roundWithoutWord = {
        ...roundSelectingMock,
        word: '',
      };
      const snapWithWord = {
        game: { ...gameMock, status: 'drawing' as const },
        round: {
          ...roundSelectingMock,
          status: 'drawing' as const,
          word: 'Elefant',
        },
      };

      const isNewer = isSnapshotNewer(snapWithWord, gameMock, roundWithoutWord);
      expect(isNewer).toBe(true);
    });
  });
});
