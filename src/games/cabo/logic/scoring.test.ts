import { describe, it, expect } from 'vitest';
import { applyAction, createGame, handValue } from './engine';
import { c, deckFrom, expectError, run, scenario } from './testFixtures';

describe('Cabo and scoring', () => {
  it('gives the caller a penalty when not strictly lowest, and ends the round after the last turn', () => {
    const state = run(
      scenario(),
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(state.phase).toBe('round_over');
    expect(state.lastRound?.handValues).toEqual([30, 15]);
    expect(state.lastRound?.callerPenalty).toBe(true);
    expect(state.lastRound?.roundScores).toEqual([40, 15]);
    expect(state.players.map((p) => p.totalScore)).toEqual([40, 15]);
    expect(state.winnerIds).toEqual([]);
  });

  it('gives no penalty when the caller holds the strictly lowest hand', () => {
    const state = createGame(['Ann', 'Ben'], {
      deck: deckFrom([
        c(0, 'A'),
        c(1, '2'),
        c(2, '3'),
        c(3, '4'),
        c(4, 'K', 'clubs'),
        c(5, 'K', 'clubs'),
        c(6, 'K', 'clubs'),
        c(7, 'K', 'clubs'),
        c(8, '6', 'diamonds'),
        c(9, '4', 'clubs'),
      ]),
    });
    const done = run(
      state,
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(done.lastRound?.handValues).toEqual([10, 52]);
    expect(done.lastRound?.callerPenalty).toBe(false);
    expect(done.players[0].totalScore).toBe(10);
  });

  it('resets a total of exactly the target score to half of it', () => {
    const state = run(
      scenario(40),
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(state.phase).toBe('round_over');
    expect(state.players[0].totalScore).toBe(20);
    expect(state.lastRound?.resetIds).toEqual(['p1']);
  });

  it('ends the game when a total passes the target, and the lowest total wins', () => {
    const state = run(
      scenario(39),
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(state.phase).toBe('game_over');
    expect(state.winnerIds).toEqual(['p2']);
  });

  it('starts a new round with totals kept and the next first player', () => {
    const over = run(
      scenario(),
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    const next = run(over, { type: 'next_round' });
    expect(next.roundNumber).toBe(2);
    expect(next.currentIndex).toBe(1);
    expect(next.phase).toBe('turn');
    expect(next.players.map((p) => p.totalScore)).toEqual([40, 15]);
    expect(next.players.map((p) => p.hand.length)).toEqual([4, 4]);
    expect(next.callerId).toBeNull();
  });

  it('penalises a caller who ties for the lowest hand', () => {
    const state = createGame(['Ann', 'Ben'], {
      deck: deckFrom([
        c(0, 'A'),
        c(1, '2'),
        c(2, '3'),
        c(3, '4'),
        c(4, '4'),
        c(5, '3'),
        c(6, '2'),
        c(7, 'A'),
        c(8, '6', 'diamonds'),
        c(9, '4', 'clubs'),
      ]),
    });
    const done = run(
      state,
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(done.lastRound?.handValues).toEqual([10, 10]);
    expect(done.lastRound?.callerPenalty).toBe(true);
    expect(done.lastRound?.roundScores).toEqual([20, 10]);
  });

  it('lets all players with the lowest total share the win', () => {
    // Ann (caller) 30 + 10 penalty = 40 > 30 ends the game; Ben and Cy tie at 10.
    const state = createGame(['Ann', 'Ben', 'Cy'], {
      targetScore: 30,
      deck: deckFrom([
        c(0, 'K', 'clubs'),
        c(1, 'K', 'spades'),
        c(2, '2'),
        c(3, '2'),
        c(4, 'A'),
        c(5, '2'),
        c(6, '3'),
        c(7, '4'),
        c(8, '4'),
        c(9, '3'),
        c(10, '2'),
        c(11, 'A'),
        c(12, '6', 'diamonds'),
        c(13, '4', 'clubs'),
        c(14, '5', 'clubs'),
      ]),
    });
    const done = run(
      state,
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(done.players.map((p) => p.totalScore)).toEqual([40, 10, 10]);
    expect(done.phase).toBe('game_over');
    expect(done.winnerIds).toEqual(['p2', 'p3']);
  });

  it('reports no_card_to_draw when deck and discard are exhausted', () => {
    const state = createGame(['Ann', 'Ben'], {
      deck: deckFrom([
        c(0, '2'),
        c(1, '2'),
        c(2, '2'),
        c(3, '2'),
        c(4, '2'),
        c(5, '2'),
        c(6, '2'),
        c(7, '2'),
        c(8, '6', 'diamonds'),
      ]),
    });
    expectError(applyAction(state, { type: 'draw', source: 'deck' }), 'no_card_to_draw');
  });

  it('ends the round after a power on the last turn', () => {
    // Ann discards 4♣, Ben swaps in 7♣; then Ann calls and Ben's last turn draws 10♠.
    const afterAnn = run(scenario(), { type: 'draw', source: 'deck' }, { type: 'discard_drawn' });
    const benTurn = run(afterAnn, { type: 'draw', source: 'deck' }, { type: 'swap', slot: 0 });
    // Ann calls Cabo; Ben draws 10♠ (peek other) as his last turn.
    const called = run(
      benTurn,
      { type: 'call_cabo' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(called.phase).toBe('power');
    const peeked = run(called, { type: 'power_peek_other', targetId: 'p1', slot: 0 });
    const done = run(peeked, { type: 'end_turn' });
    expect(done.phase).toBe('round_over');
  });

  it('allows only one Cabo call per round', () => {
    const state = run(scenario(), { type: 'call_cabo' });
    expectError(applyAction(state, { type: 'call_cabo' }), 'cabo_already_called');
  });

  it('computes hand values through handValue', () => {
    expect(handValue([c(0, 'K', 'hearts'), c(1, '10'), c(2, 'J'), c(3, 'A')])).toBe(22);
  });
});
