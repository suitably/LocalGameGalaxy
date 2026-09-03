import { describe, it, expect } from 'vitest';
import {
  extractPrecedingContext,
  checkWordInText,
  evaluateRouletteWords,
  DEFAULT_MODIFIER_SETTINGS,
} from './modifiers';
import { getRandomWords, STORY_WORDS_DE, STORY_WORDS_EN } from './storyLexicon';
import { isStorySnapshotNewer } from './engine';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot } from '../types';

describe('Storyteller Modifiers Logic', () => {
  describe('Blind Mode extraction', () => {
    it('returns empty text when no previous entries exist', () => {
      const result = extractPrecedingContext([], { enabled: true, visibleWordCount: 10 });
      expect(result.isBlind).toBe(true);
      expect(result.text).toBe('');
      expect(result.fullHistoryAvailable).toBe(false);
    });

    it('returns full text when blind mode is disabled', () => {
      const entries: StoryEntry[] = [
        {
          id: '1',
          gameId: 'g1',
          turnNumber: 1,
          authorId: 'p1',
          authorName: 'Alice',
          text: 'Es war einmal ein König.',
          wordCount: 5,
          submittedAt: new Date().toISOString(),
        },
        {
          id: '2',
          gameId: 'g1',
          turnNumber: 2,
          authorId: 'p2',
          authorName: 'Bob',
          text: 'Der König ritt auf einem Drachen.',
          wordCount: 6,
          submittedAt: new Date().toISOString(),
        },
      ];

      const result = extractPrecedingContext(entries, { enabled: false, visibleWordCount: 10 });
      expect(result.isBlind).toBe(false);
      expect(result.text).toContain('Es war einmal ein König.');
      expect(result.text).toContain('Der König ritt auf einem Drachen.');
      expect(result.fullHistoryAvailable).toBe(true);
      expect(result.precedingAuthorName).toBe('Bob');
    });

    it('extracts exactly the last 10 words with ellipsis when blind mode is enabled', () => {
      const entries: StoryEntry[] = [
        {
          id: '1',
          gameId: 'g1',
          turnNumber: 1,
          authorId: 'p1',
          authorName: 'Alice',
          text: 'Eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn.',
          wordCount: 13,
          submittedAt: new Date().toISOString(),
        },
      ];

      const result = extractPrecedingContext(entries, { enabled: true, visibleWordCount: 10 });
      expect(result.isBlind).toBe(true);
      expect(result.fullHistoryAvailable).toBe(false);
      expect(result.text).toBe('... vier fünf sechs sieben acht neun zehn elf zwölf dreizehn.');
    });

    it('returns the full last entry if it has fewer words than visibleWordCount', () => {
      const entries: StoryEntry[] = [
        {
          id: '1',
          gameId: 'g1',
          turnNumber: 1,
          authorId: 'p1',
          authorName: 'Alice',
          text: 'Es war einmal.',
          wordCount: 3,
          submittedAt: new Date().toISOString(),
        },
      ];

      const result = extractPrecedingContext(entries, { enabled: true, visibleWordCount: 10 });
      expect(result.isBlind).toBe(true);
      expect(result.text).toBe('Es war einmal.');
    });
  });

  describe('Word Roulette matcher', () => {
    it('accurately matches words case-insensitively', () => {
      expect(checkWordInText('Wir fuhren mit dem Dampfschiff über den Fluss.', 'Dampfschiff')).toBe(true);
      expect(checkWordInText('Ein gelbes dampfschiff tuckerte vorbei.', 'Dampfschiff')).toBe(true);
      expect(checkWordInText('Hier ist kein Schiff.', 'Dampfschiff')).toBe(false);
    });

    it('matches compound words and hyphenated words', () => {
      expect(checkWordInText('Das U-Boot tauchte tief ab.', 'U-Boot')).toBe(true);
      expect(checkWordInText('Im UBoot war es dunkel.', 'U-Boot')).toBe(true);
      expect(checkWordInText('Der Piratenschiffskapitän lachte laut.', 'Piratenschiff')).toBe(true);
    });

    it('evaluates multiple roulette words properly', () => {
      const required = ['Gummiente', 'Astronaut', 'Zaubertrank'];
      const text = 'Die Gummiente flog mit dem Astronauten ins All.';
      const evaluation = evaluateRouletteWords(text, required);

      expect(evaluation).toEqual([
        { word: 'Gummiente', matched: true },
        { word: 'Astronaut', matched: true },
        { word: 'Zaubertrank', matched: false },
      ]);
    });
  });

  describe('Story Lexicon', () => {
    it('returns requested number of random words for German', () => {
      const words = getRandomWords('de', 3);
      expect(words).toHaveLength(3);
      words.forEach((w) => expect(STORY_WORDS_DE).toContain(w));
    });

    it('returns requested number of random words for English', () => {
      const words = getRandomWords('en', 3);
      expect(words).toHaveLength(3);
      words.forEach((w) => expect(STORY_WORDS_EN).toContain(w));
    });

    it('excludes specified words to prevent immediate repeats', () => {
      const exclude = [STORY_WORDS_DE[0], STORY_WORDS_DE[1]];
      const words = getRandomWords('de', 3, exclude);
      expect(words).not.toContain(exclude[0]);
      expect(words).not.toContain(exclude[1]);
    });
  });

  describe('Snapshot Ordering', () => {
    const baseGame: StoryGameRecord = {
      id: 'g1',
      type: 'local',
      status: 'writing',
      turnNumber: 1,
      createdAt: '2026-09-03T10:00:00Z',
      updatedAt: '2026-09-03T10:00:00Z',
      players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      currentPlayerIndex: 0,
      options: {
        language: 'de',
        modifiers: DEFAULT_MODIFIER_SETTINGS,
      },
    };

    it('detects newer snapshot by higher turn number', () => {
      const snapshot: StoryGameSnapshot = {
        game: { ...baseGame, turnNumber: 2 },
        entries: [],
      };
      expect(isStorySnapshotNewer(snapshot, baseGame, [])).toBe(true);
    });

    it('detects newer snapshot by more entries when turns match', () => {
      const entry: StoryEntry = {
        id: 'e1',
        gameId: 'g1',
        turnNumber: 1,
        authorId: 'p1',
        authorName: 'Alice',
        text: 'Hello',
        wordCount: 1,
        submittedAt: '2026-09-03T10:05:00Z',
      };
      const snapshot: StoryGameSnapshot = {
        game: baseGame,
        entries: [entry],
      };
      expect(isStorySnapshotNewer(snapshot, baseGame, [])).toBe(true);
    });

    it('detects completion status transition as newer', () => {
      const snapshot: StoryGameSnapshot = {
        game: { ...baseGame, status: 'completed' },
        entries: [],
      };
      expect(isStorySnapshotNewer(snapshot, baseGame, [])).toBe(true);
    });
  });
});
