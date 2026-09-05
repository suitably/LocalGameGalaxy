import { describe, it, expect } from 'vitest';
import { buildGameDeepLink, buildTurnNotificationMessage } from './notificationMessageBuilder';

describe('notificationMessageBuilder', () => {
  describe('buildGameDeepLink', () => {
    it('generates a clean hash link with gameId, player and relay', () => {
      const link = buildGameDeepLink({
        gameType: 'guessart',
        gameId: 'game-123',
        playerId: 'player-abc',
        relayUrl: 'https://relay.example.com',
        origin: 'https://app.localgamegalaxy.com',
      });

      expect(link).toBe('https://app.localgamegalaxy.com#/games/guessart?gameId=game-123&player=player-abc&gameRelay=https%3A%2F%2Frelay.example.com');
    });

    it('generates minimal link when only gameId is provided', () => {
      const link = buildGameDeepLink({
        gameType: 'storyteller',
        gameId: 'story-456',
        origin: 'https://app.localgamegalaxy.com',
      });

      expect(link).toBe('https://app.localgamegalaxy.com#/games/storyteller?gameId=story-456');
    });
  });

  describe('buildTurnNotificationMessage for GuessArt', () => {
    it('formats draw notification with actor name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'guessart',
        gameName: 'GuessArt',
        gameId: 'game-123',
        actionType: 'draw',
        actorName: 'Bob',
        targetPlayerName: 'Alice',
        targetPlayerId: 'player-1',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('GuessArt: Du bist am Zeichnen!');
      expect(msg.body).toBe('Bob hat das Wort erraten! Du bist jetzt am Zeichnen.');
      expect(msg.tag).toBe('guessart-game-123');
      expect(msg.icon).toBe('/pwa/icon_full.png');
      expect(msg.url).toBe('https://example.com#/games/guessart?gameId=game-123&player=player-1');
      expect(msg.action).toBe('draw');
    });

    it('formats draw notification without actor name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'guessart',
        gameName: 'GuessArt',
        gameId: 'game-123',
        actionType: 'draw',
        targetPlayerName: 'Alice',
        targetPlayerId: 'player-1',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('GuessArt: Du bist am Zeichnen!');
      expect(msg.body).toBe('Das Wort wurde erraten! Du bist jetzt am Zeichnen.');
    });

    it('formats guess notification with actor name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'guessart',
        gameName: 'GuessArt',
        gameId: 'game-123',
        actionType: 'guess',
        actorName: 'Alice',
        targetPlayerName: 'Bob',
        targetPlayerId: 'player-2',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('GuessArt: Du bist am Raten!');
      expect(msg.body).toBe('Alice hat das Bild fertig gezeichnet. Du bist jetzt dran mit Raten!');
      expect(msg.tag).toBe('guessart-game-123');
      expect(msg.url).toBe('https://example.com#/games/guessart?gameId=game-123&player=player-2');
      expect(msg.action).toBe('guess');
    });

    it('formats guess notification without actor name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'guessart',
        gameName: 'GuessArt',
        gameId: 'game-123',
        actionType: 'guess',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('GuessArt: Du bist am Raten!');
      expect(msg.body).toBe('Ein neues Bild wartet auf dich! Du bist am Raten.');
    });
  });

  describe('buildTurnNotificationMessage for Storyteller', () => {
    it('formats storyteller turn notification with author name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'storyteller',
        gameName: 'Geschichtenschreiber',
        gameId: 'story-123',
        actionType: 'turn',
        actorName: 'Charlie',
        targetPlayerName: 'Dave',
        targetPlayerId: 'player-dave',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('Geschichtenschreiber: Du bist dran!');
      expect(msg.body).toBe('Charlie hat den Abschnitt beendet. Du bist jetzt am Zug!');
      expect(msg.tag).toBe('storyteller-story-123');
      expect(msg.url).toBe('https://example.com#/games/storyteller?gameId=story-123&player=player-dave');
      expect(msg.action).toBe('turn');
    });

    it('formats storyteller turn notification without author name', () => {
      const msg = buildTurnNotificationMessage({
        gameType: 'storyteller',
        gameName: 'Geschichtenschreiber',
        gameId: 'story-123',
        actionType: 'turn',
        origin: 'https://example.com',
      });

      expect(msg.title).toBe('Geschichtenschreiber: Du bist dran!');
      expect(msg.body).toBe('Die Geschichte geht weiter – schreibe deinen Teil!');
    });
  });
});
