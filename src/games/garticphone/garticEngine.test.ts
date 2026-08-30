import { describe, it, expect } from 'vitest';
import {
  createInitialGarticState,
  getPlayerTaskForRound,
  submitPlayerGarticStep,
  isPlayerFinishedCurrentRound,
  addPlayerToGarticGame,
} from './garticEngine';

describe('garticEngine', () => {
  it('creates initial state directly ready in prompt phase with books', () => {
    const players = [
      { id: 'p1', name: 'Player 1', ready: true },
      { id: 'p2', name: 'Player 2', ready: true },
    ];
    const state = createInitialGarticState('p1', 'Player 1', 'TESTROOM', players);
    expect(state.roomId).toBe('TESTROOM');
    expect(state.phase).toBe('prompt');
    expect(state.players).toHaveLength(2);
    expect(state.books).toHaveLength(2);
    expect(state.totalRounds).toBe(2);
  });

  it('correctly tracks isPlayerFinishedCurrentRound', () => {
    const players = [
      { id: 'p1', name: 'Player 1', ready: true },
      { id: 'p2', name: 'Player 2', ready: true },
    ];
    let state = createInitialGarticState('p1', 'Player 1', 'ROOM1', players);
    expect(isPlayerFinishedCurrentRound(state, 'p1')).toBe(false);
    expect(isPlayerFinishedCurrentRound(state, 'p2')).toBe(false);

    state = submitPlayerGarticStep(state, 'p1', 'Ein lustiger Hund');
    expect(isPlayerFinishedCurrentRound(state, 'p1')).toBe(true);
    expect(isPlayerFinishedCurrentRound(state, 'p2')).toBe(false);
  });

  it('correctly rotates books and tasks across rounds to reveal', () => {
    const players = [
      { id: 'p1', name: 'Player 1', ready: true },
      { id: 'p2', name: 'Player 2', ready: true },
      { id: 'p3', name: 'Player 3', ready: true },
    ];
    let state = createInitialGarticState('p1', 'Player 1', 'ROOM1', players);

    // Round 0: Prompt phase for all
    const p1Task = getPlayerTaskForRound(state, 'p1');
    expect(p1Task.taskType).toBe('prompt');
    expect(p1Task.hasSubmitted).toBe(false);

    // Submit prompts for all 3 players
    state = submitPlayerGarticStep(state, 'p1', 'Ein fliegender Pinguin');
    state = submitPlayerGarticStep(state, 'p2', 'Pizza mit Ananas');
    state = submitPlayerGarticStep(state, 'p3', 'Roboter tanzt Walzer');

    // Round 1: Drawing phase
    expect(state.roundIndex).toBe(1);
    expect(state.phase).toBe('drawing');

    const p1Round1 = getPlayerTaskForRound(state, 'p1');
    expect(p1Round1.taskType).toBe('drawing');
    expect(p1Round1.previousStep?.content).toBe('Roboter tanzt Walzer');

    // Submit drawings for all 3 players
    state = submitPlayerGarticStep(state, 'p1', '{"elements": []}');
    state = submitPlayerGarticStep(state, 'p2', '{"elements": []}');
    state = submitPlayerGarticStep(state, 'p3', '{"elements": []}');

    // Round 2: Guessing phase
    expect(state.roundIndex).toBe(2);
    expect(state.phase).toBe('drawing'); // dynamic phase

    // Submit guesses for all 3 players
    state = submitPlayerGarticStep(state, 'p1', 'Ein tanzender Roboter');
    state = submitPlayerGarticStep(state, 'p2', 'Ein fliegender Vogel');
    state = submitPlayerGarticStep(state, 'p3', 'Eine warme Pizza');

    // All rounds finished -> Reveal phase!
    expect(state.phase).toBe('reveal');
    expect(state.books.every((b) => b.steps.length === 3)).toBe(true);
  });

  it('allows a new player to join mid-game without resetting existing tasks', () => {
    const players = [
      { id: 'p1', name: 'Player 1', ready: true },
      { id: 'p2', name: 'Player 2', ready: true },
    ];
    let state = createInitialGarticState('p1', 'Player 1', 'ROOM1', players);

    // Round 0: P1 and P2 submit prompts
    state = submitPlayerGarticStep(state, 'p1', 'Prompt von P1');
    state = submitPlayerGarticStep(state, 'p2', 'Prompt von P2');

    // Round 1: Drawing phase
    expect(state.roundIndex).toBe(1);
    const p1Round1TaskBefore = getPlayerTaskForRound(state, 'p1');
    expect(p1Round1TaskBefore.previousStep?.content).toBe('Prompt von P2');

    // Player 3 joins mid-game during Round 1!
    state = addPlayerToGarticGame(state, { id: 'p3', name: 'Player 3' });

    // Existing P1 task must remain completely intact and undisturbed
    const p1Round1TaskAfter = getPlayerTaskForRound(state, 'p1');
    expect(p1Round1TaskAfter.taskType).toBe('drawing');
    expect(p1Round1TaskAfter.previousStep?.content).toBe('Prompt von P2');

    // P3 gets assigned their new book in prompt mode
    const p3Task = getPlayerTaskForRound(state, 'p3');
    expect(p3Task.taskType).toBe('prompt');
    expect(p3Task.hasSubmitted).toBe(false);

    // All 3 players submit their round 1 steps
    state = submitPlayerGarticStep(state, 'p1', 'P1 drawing of P2 prompt');
    state = submitPlayerGarticStep(state, 'p2', 'P2 drawing of P1 prompt');
    state = submitPlayerGarticStep(state, 'p3', 'P3 brand new prompt');

    // Advances to Round 2!
    expect(state.roundIndex).toBe(2);
    expect(state.players).toHaveLength(3);
    expect(state.books).toHaveLength(3);
  });
});
