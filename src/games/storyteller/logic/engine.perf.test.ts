import { describe, it, expect, vi } from 'vitest';
import { LocalStoryEngine } from './engine';
import type { StoryGameRecord, StoryGameSnapshot, StoryPlayer } from '../types';
import { DEFAULT_MODIFIER_SETTINGS } from './modifiers';
import * as repo from './repository';

// Mock repository functions to isolate logic performance without IndexedDB overhead
vi.mock('./repository', () => {
  let mockGames: Record<string, StoryGameRecord> = {};
  return {
    getStoryGame: vi.fn(async (id: string) => mockGames[id] || null),
    fetchEntriesForGame: vi.fn(async () => []),
    upsertGame: vi.fn(async (game: StoryGameRecord) => {
      mockGames[game.id] = game;
    }),
    upsertEntry: vi.fn(async () => {}),
    updateStoryGame: vi.fn(async (id: string, updater: any) => {
      const current = mockGames[id];
      if (!current) throw new Error('Not found');
      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      mockGames[id] = updated;
      return updated;
    }),
    _resetMockGames: (games: Record<string, StoryGameRecord>) => {
      mockGames = { ...games };
    },
  };
});

// Mock playerAssignment
vi.mock('./playerAssignment', () => ({
  playerAssignment: {
    isPlayerLocal: vi.fn(() => false),
  },
}));

describe('LocalStoryEngine Performance Benchmark', () => {
  it('benchmark importSnapshot when snapshot is newer', async () => {
    const playerCount = 10000;
    const existingPlayers: StoryPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `p_${i}`,
      name: `Player ${i}`,
      ntfyTopic: `topic_${i}`,
      relayUrl: `http://relay.example.com/${i}`,
      notificationMethod: 'ntfy',
    }));

    const incomingPlayers: StoryPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `p_${i}`,
      name: `Player ${i}`,
      ntfyTopic: `topic_${i}_new`,
      relayUrl: `http://relay.example.com/${i}_new`,
      notificationMethod: 'ntfy',
    }));

    const existingGame: StoryGameRecord = {
      id: 'g_perf_1',
      type: 'local',
      status: 'writing',
      turnNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      players: existingPlayers,
      currentPlayerIndex: 0,
      options: {
        language: 'de',
        modifiers: DEFAULT_MODIFIER_SETTINGS,
      },
    };

    (repo as any)._resetMockGames({ g_perf_1: existingGame });

    const snapshot: StoryGameSnapshot = {
      game: {
        ...existingGame,
        turnNumber: 2, // makes snapshot newer directly
        players: incomingPlayers,
      },
      entries: [],
    };

    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await LocalStoryEngine.importSnapshot(snapshot);
    }
    const elapsed = performance.now() - start;

    console.log(`[PERF BENCHMARK] importSnapshot ${iterations} iterations with ${playerCount} players took ${elapsed.toFixed(2)} ms`);
    expect(elapsed).toBeGreaterThan(0);
  });
});
