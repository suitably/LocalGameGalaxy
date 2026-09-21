import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocalStoryEngine } from './engine';
import type { StoryGameRecord, StoryGameSnapshot, StoryPlayer } from '../types';
import { DEFAULT_MODIFIER_SETTINGS } from './modifiers';
import * as repository from './repository';

vi.mock('./repository', () => ({
  getStoryGame: vi.fn(),
  fetchEntriesForGame: vi.fn(),
  updateStoryGame: vi.fn(),
  upsertGame: vi.fn(),
  upsertEntry: vi.fn(),
  createStoryGame: vi.fn(),
  listStoryGames: vi.fn(),
}));

describe('LocalStoryEngine Performance Benchmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures importSnapshot performance with player channel updates (500 players, 1000 ops)', async () => {
    const playerCount = 500;
    const existingPlayers: StoryPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: `Player ${i}`,
      isRemote: true,
      ntfyTopic: `topic_old_${i}`,
      relayUrl: `http://relay_old_${i}.com`,
      notificationMethod: 'ntfy',
    }));

    const incomingPlayers: StoryPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: `Player ${i}`,
      isRemote: true,
      ntfyTopic: i === playerCount - 1 ? `topic_NEW_${i}` : `topic_old_${i}`,
      relayUrl: `http://relay_old_${i}.com`,
      notificationMethod: 'ntfy',
    }));

    const existingGame: StoryGameRecord = {
      id: 'game_perf_1',
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

    const snapshot: StoryGameSnapshot = {
      game: {
        ...existingGame,
        players: incomingPlayers,
      },
      entries: [],
    };

    vi.mocked(repository.getStoryGame).mockResolvedValue(existingGame);
    vi.mocked(repository.fetchEntriesForGame).mockResolvedValue([]);
    vi.mocked(repository.updateStoryGame).mockImplementation(async (_id, payload) => {
      return {
        ...existingGame,
        ...(typeof payload === 'function' ? payload(existingGame) : payload),
      };
    });

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await LocalStoryEngine.importSnapshot(snapshot);
    }
    const end = performance.now();
    const totalMs = end - start;
    console.log(`[PERF BENCHMARK] importSnapshot with ${playerCount} players (${iterations} ops): ${totalMs.toFixed(2)}ms`);

    expect(totalMs).toBeGreaterThan(0);
  });

  it('measures updateGameDetails performance with player updates (500 players, 1000 ops)', async () => {
    const playerCount = 500;
    const existingPlayers: StoryPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
      id: `player_${i}`,
      name: `Player ${i}`,
      isRemote: true,
    }));

    const existingGame: StoryGameRecord = {
      id: 'game_perf_2',
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

    vi.mocked(repository.getStoryGame).mockResolvedValue(existingGame);
    vi.mocked(repository.fetchEntriesForGame).mockResolvedValue([]);
    vi.mocked(repository.updateStoryGame).mockImplementation(async (_id, payload) => {
      return {
        ...existingGame,
        ...(typeof payload === 'function' ? payload(existingGame) : payload),
      };
    });

    const payload = {
      players: existingPlayers.map((p, i) => ({ id: p.id, name: `Updated ${i}` })),
    };

    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await LocalStoryEngine.updateGameDetails('game_perf_2', payload);
    }
    const end = performance.now();
    const totalMs = end - start;
    console.log(`[PERF BENCHMARK] updateGameDetails with ${playerCount} players (${iterations} ops): ${totalMs.toFixed(2)}ms`);

    expect(totalMs).toBeGreaterThan(0);
  });
});
