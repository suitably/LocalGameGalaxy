import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMemoryDb } from './memoryDb.testUtils';
import { LocalGameEngine } from './engine';
import { getLocalGame, getRoundByNumber, updateLocalGame, upsertRound } from './repository';

vi.mock('./db', () => import('./memoryDb.testUtils'));

const EMPTY_SCENE = JSON.stringify({ elements: [], appState: {}, files: {} });
const DRAWN_SCENE = JSON.stringify({ elements: [{ id: 'e1' }], appState: {}, files: {} });

const newGame = (language = 'en') =>
  LocalGameEngine.createGame({ players: ['Ann', 'Bob', 'Cy'], language });

/** Plays a game up to the guessing phase with the word "Dog". */
const startGuessing = async (language = 'en') => {
  const game = await newGame(language);
  await LocalGameEngine.selectWord(game.id, { word: 'Dog', languageCode: language });
  return LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE);
};

describe('LocalGameEngine lifecycle', () => {
  beforeEach(() => resetMemoryDb());

  it('createGame persists a selecting game with an initial round', async () => {
    const game = await newGame('de');
    const snapshot = await LocalGameEngine.getGameSnapshot(game.id);
    expect(snapshot.game.status).toBe('selecting');
    expect(snapshot.round).toMatchObject({ roundNumber: 1, status: 'selecting', word: '' });
    expect(snapshot.round?.drawnById).toBe(game.players[0].id);
    expect(snapshot.round?.drawerIsCurrentPlayer).toBe(true);
    expect(snapshot.round?.canvasData).toBe(EMPTY_SCENE);
  });

  it('getGameSnapshot and listRounds throw / degrade for unknown games', async () => {
    await expect(LocalGameEngine.getGameSnapshot('nope')).rejects.toThrow('Local game not found');
    expect(await LocalGameEngine.listRounds('nope')).toEqual([]);
  });

  it('listGames returns created games and deleteGame removes game and rounds', async () => {
    const a = await newGame();
    const b = await newGame();
    expect((await LocalGameEngine.listGames()).map((g) => g.id).sort()).toEqual(
      [a.id, b.id].sort(),
    );
    expect(await LocalGameEngine.deleteGame(a.id)).toBe(true);
    expect((await LocalGameEngine.listGames()).map((g) => g.id)).toEqual([b.id]);
    expect(await LocalGameEngine.listRounds(a.id)).toEqual([]);
  });

  it('listRounds resolves payload fields for every round', async () => {
    const { game } = await startGuessing();
    const rounds = await LocalGameEngine.listRounds(game.id);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].word).toBe('Dog');
    expect(rounds[0].drawnByName).toBe('Ann');
  });
});

describe('updateGameDetails', () => {
  beforeEach(() => resetMemoryDb());

  it('throws for an unknown game', async () => {
    await expect(LocalGameEngine.updateGameDetails('nope', { name: 'x' })).rejects.toThrow(
      'Local game not found',
    );
  });

  it('trims the name and renames only the matching players', async () => {
    const game = await newGame();
    const [ann, bob] = game.players;
    const { game: updated } = await LocalGameEngine.updateGameDetails(game.id, {
      name: '  Party ',
      players: [{ id: bob.id, name: '  Bobby ' }],
    });
    expect(updated.name).toBe('Party');
    expect(updated.players.map((p) => p.name)).toEqual([ann.name, 'Bobby', 'Cy']);
    expect(updated.players.map((p) => p.id)).toEqual(game.players.map((p) => p.id));
  });

  it('clears a blank name and keeps untouched players and names', async () => {
    const game = await LocalGameEngine.createGame({ name: 'Old', players: ['A', 'B'] });
    const { game: updated } = await LocalGameEngine.updateGameDetails(game.id, {
      name: '   ',
      players: [{ id: game.players[0].id }],
    });
    expect(updated.name).toBeUndefined();
    expect(updated.players[0].name).toBe('A');
  });

  it('leaves name and players alone when the payload has neither', async () => {
    const game = await LocalGameEngine.createGame({ name: 'Keep', players: ['A', 'B'] });
    const { game: updated, round } = await LocalGameEngine.updateGameDetails(game.id, {});
    expect(updated.name).toBe('Keep');
    expect(updated.players).toEqual(game.players);
    expect(round?.roundNumber).toBe(1);
  });
});

describe('turn flow', () => {
  beforeEach(() => resetMemoryDb());

  it('selectWord moves to drawing and stores word, mask and translations', async () => {
    const game = await newGame();
    const { game: after, round } = await LocalGameEngine.selectWord(game.id, {
      word: ' Dog ',
      wordId: 'w_dog',
      categoryId: 'cat_animals',
      difficulty: 1,
      languageCode: 'en',
    });
    expect(after.status).toBe('drawing');
    expect(round).toMatchObject({
      status: 'drawing',
      word: 'Dog',
      wordId: 'w_dog',
      wordCategoryId: 'cat_animals',
      wordDifficulty: 1,
      wordLength: 3,
      hintLevel: 0,
    });
    // the lexicon entry w_dog adds the German translation
    expect(round?.translations?.de?.canonical).toBe('Hund');
  });

  it('selectWord falls back to the game language and rejects missing game/round', async () => {
    const game = await newGame('de');
    const { round } = await LocalGameEngine.selectWord(game.id, { word: 'Katze' });
    expect(round?.wordLanguageCode).toBe('de');
    await expect(LocalGameEngine.selectWord('nope', { word: 'x' })).rejects.toThrow(
      'Local game not found',
    );
  });

  it('selectWord is rejected outside the selecting phase', async () => {
    const game = await newGame();
    await LocalGameEngine.selectWord(game.id, { word: 'Dog' });
    await expect(LocalGameEngine.selectWord(game.id, { word: 'Cat' })).rejects.toThrow(
      /selecting phase/,
    );
  });

  it('submitDrawing is only allowed while drawing', async () => {
    const game = await newGame();
    await expect(LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE)).rejects.toThrow(
      /drawing phase/,
    );
    await expect(LocalGameEngine.submitDrawing('nope', DRAWN_SCENE)).rejects.toThrow(
      'Local game not found',
    );
  });

  it('submitDrawing stores the canvas, starts guessing and passes the turn to the next player', async () => {
    const game = await newGame();
    await LocalGameEngine.selectWord(game.id, { word: 'Dog' });
    const { game: after, round } = await LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE);
    expect(after.status).toBe('guessing');
    expect(after.currentPlayerIndex).toBe(1);
    expect(round?.status).toBe('guessing');
    expect(round?.canvasData).toBe(DRAWN_SCENE);
    expect(round?.drawerIsCurrentPlayer).toBe(false);
    expect(round?.guesserName).toBe('Bob');
  });

  it('the turn index wraps around after the last player', async () => {
    const game = await newGame();
    await updateLocalGame(game.id, { currentPlayerIndex: 2, status: 'drawing' });
    const { game: after } = await LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE);
    expect(after.currentPlayerIndex).toBe(0);
  });

  it('a wrong guess is recorded and the round stays open', async () => {
    const { game } = await startGuessing();
    const result = await LocalGameEngine.submitGuess(game.id, 'Auto');
    expect(result.correct).toBe(false);
    expect(result.game.status).toBe('guessing');
    expect(result.round?.guesses).toEqual(['Auto']);
    expect(result.round?.status).toBe('guessing');
    const stored = await getLocalGame(game.id);
    expect(stored?.roundNumber).toBe(1);
  });

  it('guessing is rejected outside the guessing phase and for unknown games', async () => {
    const game = await newGame();
    await expect(LocalGameEngine.submitGuess(game.id, 'x')).rejects.toThrow(/guessing phase/);
    await expect(LocalGameEngine.submitGuess('nope', 'x')).rejects.toThrow('Local game not found');
  });

  it('a correct guess completes the round and opens the next one for the guesser', async () => {
    const { game } = await startGuessing();
    const result = await LocalGameEngine.submitGuess(game.id, 'dog');
    expect(result.correct).toBe(true);
    expect(result.game).toMatchObject({
      status: 'selecting',
      roundNumber: 2,
      currentPlayerIndex: 1,
      statistics: { roundsCompleted: 1 },
    });
    expect(result.round).toMatchObject({
      roundNumber: 2,
      status: 'selecting',
      word: '',
      drawnById: game.players[1].id,
    });
    const first = await getRoundByNumber(game.id, 1);
    expect(first).toMatchObject({ status: 'completed', guess: 'dog' });
    expect(first?.completedAt).toBeTruthy();
  });

  it('submitGuess takes isTemporaryClaim from the argument, else from the answered round', async () => {
    // Observable effect today: none on the returned round (see the suspected bug below), so only
    // check that both paths complete the round.
    const { game } = await startGuessing();
    const round = (await getRoundByNumber(game.id, 1))!;
    await upsertRound({ ...round, temporaryClaim: true });
    expect((await LocalGameEngine.submitGuess(game.id, 'Dog')).correct).toBe(true);

    const second = await startGuessing();
    expect((await LocalGameEngine.submitGuess(second.game.id, 'Dog', 'en', false)).correct).toBe(
      true,
    );
  });

  // Suspected bug: createEmptyRound sets `temporaryClaim`, but appendRound (repository.ts) copies
  // only a fixed field list without it, so the flag never reaches the stored next round.
  it.fails('the next round keeps the temporary-claim flag of the answered round', async () => {
    const { game } = await startGuessing();
    const result = await LocalGameEngine.submitGuess(game.id, 'Dog', 'en', true);
    expect(result.round?.temporaryClaim).toBe(true);
  });

  it('after a full cycle the next round can be played by the new drawer', async () => {
    const { game } = await startGuessing();
    await LocalGameEngine.submitGuess(game.id, 'Dog');
    await LocalGameEngine.selectWord(game.id, { word: 'Cat' });
    const drawn = await LocalGameEngine.submitDrawing(game.id, DRAWN_SCENE);
    expect(drawn.game.currentPlayerIndex).toBe(2);
    expect(drawn.round?.drawnByName).toBe('Bob');
    expect(drawn.round?.guesserName).toBe('Cy');
  });
});

describe('requestHint', () => {
  beforeEach(() => resetMemoryDb());

  it('gives structure, then letters, then reports the hints as exhausted', async () => {
    const { game } = await startGuessing();
    const first = await LocalGameEngine.requestHint(game.id);
    expect(first.hint).toMatchObject({ type: 'structure', level: 1, wordLength: 3 });
    expect(first.round?.hintLevel).toBe(1);
    expect(first.hint?.letters).toEqual([]);

    const second = await LocalGameEngine.requestHint(game.id);
    expect(second.hint).toMatchObject({ type: 'letters', level: 2 });
    expect(second.round?.hintLetters?.length).toBeGreaterThan(0);

    const third = await LocalGameEngine.requestHint(game.id);
    expect(third.exhausted).toBe(true);
    expect(third.hint).toBeUndefined();
    expect(third.round?.hintLevel).toBe(2);
  });

  // Suspected bug: toRoundPayload always replaces hintLetters with the full letter set from
  // resolveHintArtifacts, so the payload exposes letters already at hint level 1.
  it.fails('the round payload exposes no hint letters before hint level 2', async () => {
    const { game } = await startGuessing();
    const first = await LocalGameEngine.requestHint(game.id);
    expect(first.round?.hintLetters).toEqual([]);
  });

  it('from hint level 2 only an exact guess counts', async () => {
    const { game } = await startGuessing();
    await LocalGameEngine.requestHint(game.id);
    await LocalGameEngine.requestHint(game.id);
    const typo = await LocalGameEngine.submitGuess(game.id, 'Dogg');
    expect(typo.correct).toBe(false);
    expect((await LocalGameEngine.submitGuess(game.id, 'Dog')).correct).toBe(true);
  });

  it('rejects hints outside the guessing phase and for unknown games', async () => {
    const game = await newGame();
    await expect(LocalGameEngine.requestHint(game.id)).rejects.toThrow(/guessing phase/);
    await expect(LocalGameEngine.requestHint('nope')).rejects.toThrow('Local game not found');
  });
});
