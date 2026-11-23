import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMemoryDb } from './memoryDb.testUtils';
import {
  appendRound,
  clearAllGames,
  createInitialRound,
  createLocalGame,
  deleteLocalGame,
  fetchRoundsForGame,
  getLocalGame,
  getRoundByNumber,
  listLocalGames,
  updateLocalGame,
  upsertGame,
  upsertRound,
} from './repository';

vi.mock('./db', () => import('./memoryDb.testUtils'));

beforeEach(() => {
  resetMemoryDb();
});

describe('createInitialRound', () => {
  it('starts a selecting round 1 for the given drawer', () => {
    const r = createInitialRound('g1', 'p1');
    expect(r).toMatchObject({
      gameId: 'g1',
      roundNumber: 1,
      drawnById: 'p1',
      status: 'selecting',
      word: '',
      guesses: [],
      hintLevel: 0,
      canvasData: null,
      completedAt: null,
    });
    expect(r.id).toMatch(/^round-/);
  });
});

describe('createLocalGame', () => {
  it('rejects fewer than two players', async () => {
    await expect(createLocalGame({ players: ['Solo'] })).rejects.toThrow(/two players/);
    await expect(createLocalGame({ players: [] })).rejects.toThrow(/two players/);
  });

  it('trims names, seats all players and persists game and first round', async () => {
    const game = await createLocalGame({
      name: '  Fun  ',
      players: [' Ann ', { name: ' Bob ' }],
      language: 'de',
      manualWordMode: true,
      ownerId: 'owner-1',
    });
    expect(game.name).toBe('Fun');
    expect(game.players.map((p) => p.name)).toEqual(['Ann', 'Bob']);
    expect(game.players[0].id).toMatch(/^player1-/);
    expect(game.players[1].id).toMatch(/^player2-/);
    expect(game).toMatchObject({
      type: 'local',
      status: 'selecting',
      roundNumber: 1,
      currentPlayerIndex: 0,
      options: { language: 'de', manualWordMode: true, ownerId: 'owner-1' },
      statistics: { roundsCompleted: 0 },
    });
    expect(await getLocalGame(game.id)).toEqual(game);
    const round = await getRoundByNumber(game.id, 1);
    expect(round?.drawnById).toBe(game.players[0].id);
    expect(round?.status).toBe('selecting');
  });

  it('defaults language, manual mode, owner and drops blank names', async () => {
    const game = await createLocalGame({ name: '   ', players: ['A', 'B'] });
    expect(game.name).toBeUndefined();
    expect(game.options).toMatchObject({ language: 'en', manualWordMode: false, ownerId: null });
  });
});

describe('game CRUD', () => {
  it('returns null for an unknown game', async () => {
    expect(await getLocalGame('nope')).toBeNull();
  });

  it('updateLocalGame merges a partial update and bumps updatedAt', async () => {
    const game = await createLocalGame({ players: ['A', 'B'] });
    const next = await updateLocalGame(game.id, { status: 'drawing' });
    expect(next.status).toBe('drawing');
    expect(next.players).toEqual(game.players);
    expect(next.updatedAt >= game.updatedAt).toBe(true);
    expect((await getLocalGame(game.id))?.status).toBe('drawing');
  });

  it('updateLocalGame accepts an updater function', async () => {
    const game = await createLocalGame({ players: ['A', 'B'] });
    const next = await updateLocalGame(game.id, (c) => ({ ...c, roundNumber: c.roundNumber + 4 }));
    expect(next.roundNumber).toBe(5);
  });

  it('updateLocalGame throws for a missing game', async () => {
    await expect(updateLocalGame('missing', { status: 'drawing' })).rejects.toThrow(
      'Game not found',
    );
  });

  it('listLocalGames returns the most recently updated game first', async () => {
    const a = await createLocalGame({ players: ['A', 'B'] });
    const b = await createLocalGame({ players: ['C', 'D'] });
    await upsertGame({ ...a, updatedAt: '2030-01-01T00:00:00.000Z' });
    await upsertGame({ ...b, updatedAt: '2020-01-01T00:00:00.000Z' });
    expect((await listLocalGames()).map((g) => g.id)).toEqual([a.id, b.id]);
  });
});

describe('rounds', () => {
  it('upsertRound stamps updatedAt and persists', async () => {
    const game = await createLocalGame({ players: ['A', 'B'] });
    const round = (await getRoundByNumber(game.id, 1))!;
    const saved = await upsertRound({ ...round, word: 'Dog', updatedAt: 'old' });
    expect(saved.updatedAt).not.toBe('old');
    expect((await getRoundByNumber(game.id, 1))?.word).toBe('Dog');
  });

  it('appendRound fills defaults and resets timestamps', async () => {
    const game = await createLocalGame({ players: ['A', 'B'] });
    const appended = await appendRound(game.id, { roundNumber: 2, drawnById: 'p2' });
    expect(appended).toMatchObject({
      gameId: game.id,
      roundNumber: 2,
      drawnById: 'p2',
      status: 'selecting',
      word: '',
      wordId: null,
      wordLanguageCode: 'en',
      wordDifficulty: 3,
      translations: {},
      guesses: [],
      hintLevel: 0,
      hintRequested: false,
      wordLength: 0,
      canvasData: null,
      completedAt: null,
    });
    expect(appended.id).toMatch(/^round-/);
    expect(await getRoundByNumber(game.id, 2)).toMatchObject({ id: appended.id });
  });

  it('appendRound keeps provided fields and defaults the round number to 1', async () => {
    const appended = await appendRound('g', {
      id: 'fixed',
      word: 'Cat',
      guesses: ['x'],
      hintLevel: 2,
    });
    expect(appended).toMatchObject({ id: 'fixed', roundNumber: 1, word: 'Cat', hintLevel: 2 });
    expect(appended.guesses).toEqual(['x']);
  });

  it('fetchRoundsForGame returns only the rounds of that game', async () => {
    const a = await createLocalGame({ players: ['A', 'B'] });
    const b = await createLocalGame({ players: ['C', 'D'] });
    await appendRound(a.id, { roundNumber: 2 });
    expect(await fetchRoundsForGame(a.id)).toHaveLength(2);
    expect(await fetchRoundsForGame(b.id)).toHaveLength(1);
  });

  it('getRoundByNumber falls back to a round of the game when the number is unknown', async () => {
    const game = await createLocalGame({ players: ['A', 'B'] });
    await appendRound(game.id, { roundNumber: 2, id: 'r2' });
    const fallback = await getRoundByNumber(game.id, 99);
    expect(fallback?.gameId).toBe(game.id);
  });

  it('getRoundByNumber returns null when the game has no rounds', async () => {
    expect(await getRoundByNumber('ghost', 1)).toBeNull();
  });
});

describe('delete and clear', () => {
  it('deleteLocalGame removes the game and all its rounds only', async () => {
    const a = await createLocalGame({ players: ['A', 'B'] });
    const b = await createLocalGame({ players: ['C', 'D'] });
    await appendRound(a.id, { roundNumber: 2 });
    await deleteLocalGame(a.id);
    expect(await getLocalGame(a.id)).toBeNull();
    expect(await fetchRoundsForGame(a.id)).toEqual([]);
    expect(await getLocalGame(b.id)).not.toBeNull();
    expect(await fetchRoundsForGame(b.id)).toHaveLength(1);
  });

  it('clearAllGames empties both stores', async () => {
    const a = await createLocalGame({ players: ['A', 'B'] });
    await clearAllGames();
    expect(await listLocalGames()).toEqual([]);
    expect(await fetchRoundsForGame(a.id)).toEqual([]);
  });
});
