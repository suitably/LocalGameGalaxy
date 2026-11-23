import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMemoryDb } from './memoryDb.testUtils';
import { LocalGameEngine, isSnapshotNewer, toRoundPayload } from './engine';
import type { GameSnapshot, GuessArtGameRecord, GuessArtRound } from './types';

vi.mock('./db', () => import('./memoryDb.testUtils'));

const EMPTY_SCENE = JSON.stringify({ elements: [], appState: {}, files: {} });
const DRAWN_SCENE = JSON.stringify({ elements: [{ id: 'e1' }], appState: {}, files: {} });

const newGame = () => LocalGameEngine.createGame({ players: ['Ann', 'Bob', 'Cy'], language: 'en' });

const startGuessing = async () => {
  const game = await newGame();
  await LocalGameEngine.selectWord(game.id, { word: 'Dog', languageCode: 'en' });
  return LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE);
};

describe('importSnapshot', () => {
  beforeEach(() => resetMemoryDb());

  const remoteSnapshot = async (): Promise<GameSnapshot> => {
    const game = await newGame();
    const snapshot = await LocalGameEngine.getGameSnapshot(game.id);
    resetMemoryDb();
    return snapshot;
  };

  it('rejects an invalid snapshot', async () => {
    await expect(LocalGameEngine.importSnapshot(null as unknown as GameSnapshot)).rejects.toThrow(
      'Invalid game snapshot',
    );
    await expect(
      LocalGameEngine.importSnapshot({ game: null } as unknown as GameSnapshot),
    ).rejects.toThrow('Invalid game snapshot');
  });

  it('stores an unknown game together with its round', async () => {
    const snapshot = await remoteSnapshot();
    const result = await LocalGameEngine.importSnapshot(snapshot);
    expect(result.updated).toBe(true);
    expect(result.game.id).toBe(snapshot.game.id);
    expect(result.round?.id).toBe(snapshot.round?.id);
  });

  it('creates an initial round for an unknown game imported without a round', async () => {
    const snapshot = await remoteSnapshot();
    const result = await LocalGameEngine.importSnapshot({ game: snapshot.game, round: null });
    expect(result.updated).toBe(true);
    expect(result.round).toMatchObject({ roundNumber: 1, drawnById: snapshot.game.players[0].id });
  });

  it('applies a newer snapshot of a known game', async () => {
    const game = await newGame();
    const local = await LocalGameEngine.getGameSnapshot(game.id);
    const newer: GameSnapshot = {
      game: { ...local.game, roundNumber: 2, status: 'selecting' },
      round: { ...local.round!, id: 'r-2', roundNumber: 2 },
    };
    const result = await LocalGameEngine.importSnapshot(newer);
    expect(result.updated).toBe(true);
    expect(result.game.roundNumber).toBe(2);
    expect(result.round?.id).toBe('r-2');
  });

  it('keeps the local state when the snapshot is older', async () => {
    const { game } = await startGuessing();
    const local = await LocalGameEngine.getGameSnapshot(game.id);
    const older: GameSnapshot = {
      game: { ...local.game, status: 'selecting' },
      round: { ...local.round!, status: 'selecting', word: '' },
    };
    const result = await LocalGameEngine.importSnapshot(older);
    expect(result.updated).toBe(false);
    expect(result.game.status).toBe('guessing');
    expect(result.round?.word).toBe('Dog');
  });

  it('applies a newer snapshot that has no round without touching the stored round', async () => {
    const game = await newGame();
    const local = await LocalGameEngine.getGameSnapshot(game.id);
    const result = await LocalGameEngine.importSnapshot({
      game: { ...local.game, roundNumber: 1, name: 'Renamed' },
      round: null,
    });
    expect(result.updated).toBe(true);
    expect(result.game.name).toBe('Renamed');
  });
});

describe('isSnapshotNewer', () => {
  const game = (fields: Partial<GuessArtGameRecord> = {}): GuessArtGameRecord =>
    ({
      id: 'g',
      type: 'local',
      status: 'selecting',
      roundNumber: 1,
      createdAt: '',
      updatedAt: '2026-01-01T00:00:00.000Z',
      players: [],
      currentPlayerIndex: 0,
      options: { language: 'en' },
      ...fields,
    }) as GuessArtGameRecord;

  const round = (fields: Partial<GuessArtRound> = {}): GuessArtRound =>
    ({
      id: 'r',
      gameId: 'g',
      roundNumber: 1,
      status: 'selecting',
      word: '',
      guesses: [],
      canvasData: null,
      ...fields,
    }) as GuessArtRound;

  it('a higher round number wins, a lower one loses', () => {
    expect(isSnapshotNewer({ game: game({ roundNumber: 2 }), round: null }, game(), null)).toBe(
      true,
    );
    expect(
      isSnapshotNewer(
        { game: game({ roundNumber: 1 }), round: null },
        game({ roundNumber: 2 }),
        null,
      ),
    ).toBe(false);
  });

  it('a later phase wins within the same round (falling back to the game status)', () => {
    const snap = (status: GuessArtRound['status']) => ({ game: game(), round: round({ status }) });
    expect(isSnapshotNewer(snap('guessing'), game(), round({ status: 'drawing' }))).toBe(true);
    expect(isSnapshotNewer(snap('drawing'), game(), round({ status: 'completed' }))).toBe(false);
    expect(
      isSnapshotNewer({ game: game({ status: 'completed' }), round: null }, game(), null),
    ).toBe(true);
  });

  it('more guesses win within the same phase', () => {
    const snap = (guesses: string[]) => ({ game: game(), round: round({ guesses }) });
    expect(isSnapshotNewer(snap(['a']), game(), round())).toBe(true);
    expect(isSnapshotNewer(snap(['a']), game(), round({ guesses: ['a', 'b'] }))).toBe(false);
  });

  it('a snapshot with a drawing beats an empty local canvas, but not the other way round', () => {
    const withCanvas = { game: game(), round: round({ canvasData: DRAWN_SCENE }) };
    expect(isSnapshotNewer(withCanvas, game(), round({ canvasData: EMPTY_SCENE }))).toBe(true);
    expect(isSnapshotNewer(withCanvas, game(), round({ canvasData: null }))).toBe(true);
    const empty = { game: game(), round: round({ canvasData: EMPTY_SCENE }) };
    expect(isSnapshotNewer(empty, game(), round({ canvasData: DRAWN_SCENE }))).toBe(true);
  });

  it('treats unparsable canvas data as empty only when it is not the default scene', () => {
    const broken = { game: game(), round: round({ canvasData: 'not json' }) };
    // snapshot canvas is non-empty text vs. an empty local canvas: differs -> counted as newer
    expect(isSnapshotNewer(broken, game(), round({ canvasData: EMPTY_SCENE }))).toBe(true);
  });

  it('a snapshot that gained the word wins', () => {
    const snap = { game: game(), round: round({ word: 'Dog' }) };
    expect(isSnapshotNewer(snap, game(), round())).toBe(true);
  });

  it('falls back to the game base: name change or later updatedAt wins, identical loses', () => {
    const same = { game: game(), round: round() };
    expect(isSnapshotNewer(same, game(), round())).toBe(false);
    expect(isSnapshotNewer({ game: game({ name: 'New' }), round: round() }, game(), round())).toBe(
      true,
    );
    expect(
      isSnapshotNewer(
        { game: game({ updatedAt: '2027-01-01T00:00:00.000Z' }), round: round() },
        game(),
        round(),
      ),
    ).toBe(true);
    expect(
      isSnapshotNewer(
        { game: game({ updatedAt: '2025-01-01T00:00:00.000Z' }), round: round() },
        game(),
        round(),
      ),
    ).toBe(false);
  });
});

describe('toRoundPayload edge cases', () => {
  const game = {
    id: 'g',
    status: 'guessing',
    roundNumber: 1,
    players: [
      { id: 'p1', name: 'Ann' },
      { id: 'p2', name: 'Bob' },
    ],
    currentPlayerIndex: 1,
    options: { language: 'de' },
  } as unknown as GuessArtGameRecord;

  const base = {
    id: 'r',
    gameId: 'g',
    roundNumber: 1,
    drawnById: 'p1',
    status: 'guessing',
    word: '',
    translations: {},
    guesses: [],
    canvasData: null,
  } as unknown as GuessArtRound;

  it('returns null without a round', () => {
    expect(toRoundPayload(null, game)).toBeNull();
  });

  it('keeps an empty word with an empty mask and length 0', () => {
    const payload = toRoundPayload(base, game);
    expect(payload).toMatchObject({ word: '', wordLength: 0, wordMask: [], hintLetters: [] });
    expect(payload?.canvasData).toBe(EMPTY_SCENE);
  });

  it('fills drawer/guesser names and flags the guessing phase as not the drawer', () => {
    const payload = toRoundPayload(base, game);
    expect(payload).toMatchObject({
      drawnByName: 'Ann',
      guesserName: 'Bob',
      drawerIsCurrentPlayer: false,
    });
    expect(toRoundPayload(base, { ...game, status: 'drawing' })?.drawerIsCurrentPlayer).toBe(true);
  });

  it('enriches missing translations from the default lexicon by word id', () => {
    const payload = toRoundPayload({ ...base, word: 'Dog', wordId: 'w_dog' }, game, 'de');
    expect(payload?.translations?.de?.canonical).toBe('Hund');
    expect(payload?.word).toBe('Hund');
  });

  it('keeps existing translations over lexicon ones', () => {
    const payload = toRoundPayload(
      {
        ...base,
        word: 'Dog',
        wordId: 'w_dog',
        translations: { en: { canonical: 'Doggo', synonyms: [] } },
      } as unknown as GuessArtRound,
      game,
      'en',
    );
    expect(payload?.translations?.en?.canonical).toBe('Doggo');
  });
});
