import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryEntry, StoryGameRecord, StoryGameSnapshot, StoryPlayer } from '../types';
import { DEFAULT_MODIFIER_SETTINGS } from './modifiers';

// In-memory stand-in for the IndexedDB-backed repository, mirroring its signatures.
const store = vi.hoisted(() => ({
  games: new Map<string, StoryGameRecord>(),
  entries: new Map<string, StoryEntry>(),
  seq: 0,
}));

vi.mock('./repository', () => ({
  createStoryGame: vi.fn(async (payload: { name?: string; players: string[] }) => {
    const game = makeGame({
      id: `g${++store.seq}`,
      name: payload.name,
      players: payload.players.map((name, i) => ({ id: `p${i}`, name })),
    });
    store.games.set(game.id, game);
    return game;
  }),
  getStoryGame: vi.fn(async (id: string) => store.games.get(id) ?? null),
  listStoryGames: vi.fn(async () => [...store.games.values()]),
  fetchEntriesForGame: vi.fn(async (gameId: string) =>
    [...store.entries.values()]
      .filter((e) => e.gameId === gameId)
      .sort((a, b) => a.turnNumber - b.turnNumber),
  ),
  updateStoryGame: vi.fn(
    async (
      id: string,
      updater: ((c: StoryGameRecord) => StoryGameRecord) | Partial<StoryGameRecord>,
    ) => {
      const current = store.games.get(id)!;
      const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      store.games.set(id, next);
      return next;
    },
  ),
  appendEntry: vi.fn(async (gameId: string, data: Omit<StoryEntry, 'id'>) => {
    const entry = { ...data, gameId, id: `e${++store.seq}` };
    store.entries.set(entry.id, entry);
    return entry;
  }),
  upsertGame: vi.fn(async (game: StoryGameRecord) => void store.games.set(game.id, game)),
  upsertEntry: vi.fn(async (entry: StoryEntry) => void store.entries.set(entry.id, entry)),
}));

import { isStorySnapshotNewer, LocalStoryEngine } from './engine';

function makeGame(overrides: Partial<StoryGameRecord> = {}): StoryGameRecord {
  return {
    id: 'g0',
    type: 'local',
    status: 'writing',
    turnNumber: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    players: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
      { id: 'c', name: 'Cleo' },
    ],
    currentPlayerIndex: 0,
    options: { language: 'en', modifiers: DEFAULT_MODIFIER_SETTINGS },
    ...overrides,
  };
}

const makeEntry = (turnNumber: number, gameId = 'g0'): StoryEntry => ({
  id: `entry${turnNumber}`,
  gameId,
  turnNumber,
  authorId: 'a',
  authorName: 'Alice',
  text: 'once upon a time',
  wordCount: 4,
  submittedAt: '2026-01-01T00:00:00.000Z',
});

const seed = (game: StoryGameRecord, entries: StoryEntry[] = []) => {
  store.games.set(game.id, game);
  entries.forEach((e) => store.entries.set(e.id, e));
};

const rouletteOn = (wordsPerTurn = 2) => ({
  ...DEFAULT_MODIFIER_SETTINGS,
  wordRoulette: { enabled: true, wordsPerTurn },
});

beforeEach(() => {
  store.games.clear();
  store.entries.clear();
  store.seq = 0;
});

describe('LocalStoryEngine.createGame / listGames / getGameSnapshot', () => {
  it('delegates creation and lists the stored games', async () => {
    const game = await LocalStoryEngine.createGame({ name: 'Tale', players: ['Ann', 'Ben'] });
    expect(game.players.map((p) => p.name)).toEqual(['Ann', 'Ben']);
    expect(await LocalStoryEngine.listGames()).toHaveLength(1);
  });

  it('returns game and its entries ordered by turn', async () => {
    seed(makeGame(), [makeEntry(2), makeEntry(1)]);
    const snap = await LocalStoryEngine.getGameSnapshot('g0');
    expect(snap.entries.map((e) => e.turnNumber)).toEqual([1, 2]);
  });

  it('throws for an unknown game', async () => {
    await expect(LocalStoryEngine.getGameSnapshot('nope')).rejects.toThrow('not found');
  });
});

describe('LocalStoryEngine.submitTurn (turn rotation)', () => {
  it('stores the entry for the active player and advances to the next player', async () => {
    seed(makeGame());
    const snap = await LocalStoryEngine.submitTurn('g0', {
      text: '  The dragon   woke up  ',
      timeSpentSeconds: 12,
    });
    const [entry] = snap.entries;
    expect(entry).toMatchObject({
      turnNumber: 1,
      authorId: 'a',
      authorName: 'Alice',
      text: 'The dragon   woke up',
      wordCount: 4,
      timeSpentSeconds: 12,
    });
    expect(snap.game.currentPlayerIndex).toBe(1);
    expect(snap.game.turnNumber).toBe(2);
    expect(snap.game.statistics).toEqual({ totalWords: 4, totalTurns: 1 });
  });

  it('wraps around to the first player after the last one and accumulates statistics', async () => {
    seed(
      makeGame({
        currentPlayerIndex: 2,
        turnNumber: 3,
        statistics: { totalWords: 10, totalTurns: 2 },
      }),
    );
    const snap = await LocalStoryEngine.submitTurn('g0', { text: 'one two three' });
    expect(snap.game.currentPlayerIndex).toBe(0);
    expect(snap.game.turnNumber).toBe(4);
    expect(snap.game.statistics).toEqual({ totalWords: 13, totalTurns: 3 });
  });

  it('plays a full round in player order', async () => {
    seed(makeGame());
    for (let i = 0; i < 4; i++) await LocalStoryEngine.submitTurn('g0', { text: `turn ${i}` });
    const snap = await LocalStoryEngine.getGameSnapshot('g0');
    expect(snap.entries.map((e) => e.authorName)).toEqual(['Alice', 'Bob', 'Cleo', 'Alice']);
    expect(snap.entries.map((e) => e.turnNumber)).toEqual([1, 2, 3, 4]);
  });

  it('rejects empty text, unknown games and completed stories without changing state', async () => {
    seed(makeGame());
    await expect(LocalStoryEngine.submitTurn('g0', { text: '   ' })).rejects.toThrow('empty');
    await expect(LocalStoryEngine.submitTurn('missing', { text: 'x' })).rejects.toThrow(
      'not found',
    );
    seed(makeGame({ id: 'done', status: 'completed' }));
    await expect(LocalStoryEngine.submitTurn('done', { text: 'x' })).rejects.toThrow(
      'not in writing state',
    );
    expect(store.entries.size).toBe(0);
    expect(store.games.get('g0')?.turnNumber).toBe(1);
  });

  it('falls back to an unknown author when the player index is out of range', async () => {
    seed(makeGame({ currentPlayerIndex: 9 }));
    const snap = await LocalStoryEngine.submitTurn('g0', { text: 'hello' });
    expect(snap.entries[0]).toMatchObject({ authorId: 'unknown', authorName: 'Unknown Player' });
  });

  it.todo(
    'suspected bug: submitTurn on a game with zero players yields currentPlayerIndex NaN (x % 0); decide whether to reject',
  );
});

describe('LocalStoryEngine.submitTurn (word roulette)', () => {
  it('rejects a text missing required words and names them', async () => {
    seed(
      makeGame({
        options: { language: 'en', modifiers: rouletteOn() },
        currentRequiredWords: ['castle', 'moon'],
      }),
    );
    await expect(
      LocalStoryEngine.submitTurn('g0', { text: 'A castle stood alone.' }),
    ).rejects.toThrow('Missing required roulette words: moon');
    expect(store.entries.size).toBe(0);
  });

  it('accepts a text with all words, stores them and draws new words for the next turn', async () => {
    seed(
      makeGame({
        options: { language: 'en', modifiers: rouletteOn(2) },
        currentRequiredWords: ['castle', 'moon'],
      }),
    );
    const snap = await LocalStoryEngine.submitTurn('g0', {
      text: 'The Moon rose over the castle.',
    });
    expect(snap.entries[0].requiredWords).toEqual(['castle', 'moon']);
    expect(snap.game.currentRequiredWords).toHaveLength(2);
    expect(snap.game.currentRequiredWords).not.toContain('castle');
    expect(snap.game.currentRequiredWords).not.toContain('moon');
  });

  it('draws no words when the roulette is off', async () => {
    seed(makeGame());
    const snap = await LocalStoryEngine.submitTurn('g0', { text: 'plain turn' });
    expect(snap.game.currentRequiredWords).toBeUndefined();
  });
});

describe('LocalStoryEngine.finishStory (story end)', () => {
  it('marks the story completed and keeps the entries', async () => {
    seed(makeGame(), [makeEntry(1)]);
    const snap = await LocalStoryEngine.finishStory('g0');
    expect(snap.game.status).toBe('completed');
    expect(snap.entries).toHaveLength(1);
  });

  it('throws for an unknown game', async () => {
    await expect(LocalStoryEngine.finishStory('nope')).rejects.toThrow('not found');
  });
});

describe('LocalStoryEngine.updateGameDetails', () => {
  it('trims the name, clears blank names and merges player edits by id', async () => {
    seed(makeGame({ name: 'Old' }));
    const renamed = await LocalStoryEngine.updateGameDetails('g0', {
      name: '  New  ',
      players: [
        { id: 'b', name: '  Robert ' },
        { id: 'zzz', name: 'Ghost' },
        { id: 'c', isRemote: true },
      ],
    });
    expect(renamed.game.name).toBe('New');
    expect(renamed.game.players.map((p) => p.name)).toEqual(['Alice', 'Robert', 'Cleo']);
    expect(renamed.game.players[2].isRemote).toBe(true);
    expect(renamed.game.players).toHaveLength(3);

    const cleared = await LocalStoryEngine.updateGameDetails('g0', { name: '   ' });
    expect(cleared.game.name).toBeUndefined();
    expect(cleared.game.players.map((p: StoryPlayer) => p.name)).toEqual([
      'Alice',
      'Robert',
      'Cleo',
    ]);
  });

  it('keeps the name when none is given and throws for unknown games', async () => {
    seed(makeGame({ name: 'Keep' }));
    expect((await LocalStoryEngine.updateGameDetails('g0', {})).game.name).toBe('Keep');
    await expect(LocalStoryEngine.updateGameDetails('nope', {})).rejects.toThrow('not found');
  });
});

describe('isStorySnapshotNewer', () => {
  const snapshot = (game: StoryGameRecord, entries: StoryEntry[] = []): StoryGameSnapshot => ({
    game,
    entries,
  });

  it('prefers the higher turn number, then more entries', () => {
    const base = makeGame({ turnNumber: 3 });
    expect(isStorySnapshotNewer(snapshot(makeGame({ turnNumber: 2 })), base, [])).toBe(false);
    expect(isStorySnapshotNewer(snapshot(base, []), base, [makeEntry(1)])).toBe(false);
  });

  it('is not newer for an identical snapshot, and newer when the name differs', () => {
    const base = makeGame();
    expect(isStorySnapshotNewer(snapshot(makeGame()), base, [])).toBe(false);
    expect(isStorySnapshotNewer(snapshot(makeGame({ name: 'Renamed' })), base, [])).toBe(true);
  });
});

describe('LocalStoryEngine.importSnapshot', () => {
  it('rejects an invalid snapshot', async () => {
    await expect(
      LocalStoryEngine.importSnapshot(undefined as unknown as StoryGameSnapshot),
    ).rejects.toThrow('Invalid story snapshot');
    await expect(
      LocalStoryEngine.importSnapshot({} as unknown as StoryGameSnapshot),
    ).rejects.toThrow('Invalid story snapshot');
  });

  it('stores an unknown game together with its entries', async () => {
    const result = await LocalStoryEngine.importSnapshot({
      game: makeGame({ id: 'new' }),
      entries: [makeEntry(1, 'new')],
    });
    expect(result.updated).toBe(true);
    expect(store.games.has('new')).toBe(true);
    expect(store.entries.size).toBe(1);
  });

  it('stores an unknown game without entries', async () => {
    const result = await LocalStoryEngine.importSnapshot({
      game: makeGame({ id: 'bare' }),
    } as unknown as StoryGameSnapshot);
    expect(result.entries).toEqual([]);
  });

  it('replaces the local state with a newer snapshot', async () => {
    seed(makeGame({ turnNumber: 1 }));
    const result = await LocalStoryEngine.importSnapshot({
      game: makeGame({ turnNumber: 2, currentPlayerIndex: 1 }),
      entries: [makeEntry(1)],
    });
    expect(result.updated).toBe(true);
    expect(store.games.get('g0')?.turnNumber).toBe(2);
    expect(result.entries).toHaveLength(1);
  });

  it('ignores an older snapshot that changes nothing', async () => {
    seed(makeGame({ turnNumber: 4 }), [makeEntry(1), makeEntry(2), makeEntry(3)]);
    const result = await LocalStoryEngine.importSnapshot({
      game: makeGame({ turnNumber: 2 }),
      entries: [makeEntry(1)],
    });
    expect(result.updated).toBe(false);
    expect(result.game.turnNumber).toBe(4);
    expect(result.entries).toHaveLength(3);
  });
});
