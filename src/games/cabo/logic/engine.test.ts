import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from './engine';
import { DECK_SIZE } from './deck';
import { c, deckFrom, expectError, run, scenario } from './testFixtures';

describe('createGame', () => {
  it('deals four cards each, one discard and the rest in the deck', () => {
    const state = createGame(['Ann', 'Ben', 'Cy']);
    expect(state.players.map((p) => p.hand.length)).toEqual([4, 4, 4]);
    expect(state.discard).toHaveLength(1);
    expect(state.deck).toHaveLength(DECK_SIZE - 3 * 4 - 1);
    expect(state.phase).toBe('turn');
    expect(state.currentIndex).toBe(0);
  });

  it('lets each player see only the bottom two cards at the start', () => {
    const state = createGame(['Ann', 'Ben']);
    for (const player of state.players) {
      expect(player.memory).toEqual([player.hand[2].id, player.hand[3].id]);
    }
  });

  it('rotates the first player with the round number', () => {
    const state = createGame(['A', 'B', 'C']);
    expect(state.roundNumber).toBe(1);
    expect(state.currentIndex).toBe(0);
  });

  it('rejects player counts outside 2-6', () => {
    expect(() => createGame(['solo'])).toThrow();
    expect(() => createGame(['1', '2', '3', '4', '5', '6', '7'])).toThrow();
  });
});

describe('draw, swap and discard', () => {
  it('draws from the deck and remembers the card', () => {
    const state = run(scenario(), { type: 'draw', source: 'deck' });
    expect(state.phase).toBe('drawn');
    expect(state.drawn?.card.id).toBe(9);
    expect(state.players[0].memory).toContain(9);
    expect(state.deck).toHaveLength(3);
  });

  it('rejects a second draw in the same turn', () => {
    const state = run(scenario(), { type: 'draw', source: 'deck' });
    expectError(applyAction(state, { type: 'draw', source: 'deck' }), 'wrong_phase');
  });

  it('swaps the drawn card into a slot, puts the old card on the discard and passes the turn', () => {
    const state = run(scenario(), { type: 'draw', source: 'deck' }, { type: 'swap', slot: 0 });
    expect(state.players[0].hand[0].id).toBe(9);
    expect(state.discard.at(-1)?.id).toBe(0);
    expect(state.currentIndex).toBe(1);
    expect(state.phase).toBe('turn');
  });

  it('discards a plain drawn card and passes the turn', () => {
    const state = run(scenario(), { type: 'draw', source: 'deck' }, { type: 'discard_drawn' });
    expect(state.discard.at(-1)?.id).toBe(9);
    expect(state.currentIndex).toBe(1);
  });

  it('forces a swap for a card taken from the discard pile', () => {
    const state = run(scenario(), { type: 'draw', source: 'discard' });
    expect(state.drawn?.card.id).toBe(8);
    expectError(applyAction(state, { type: 'discard_drawn' }), 'must_swap');
    const swapped = run(state, { type: 'swap', slot: 1 });
    expect(swapped.players[0].hand[1].id).toBe(8);
  });

  it('rejects invalid slots', () => {
    const state = run(scenario(), { type: 'draw', source: 'deck' });
    expectError(applyAction(state, { type: 'swap', slot: 4 }), 'invalid_slot');
    expectError(applyAction(state, { type: 'swap', slot: -1 }), 'invalid_slot');
  });
});

describe('special powers', () => {
  it('7 peeks one own card, then the turn passes', () => {
    const discarded = run(scenario(), { type: 'draw', source: 'deck' }, { type: 'discard_drawn' });
    const state = run(discarded, { type: 'draw', source: 'deck' });
    expect(state.drawn?.card.id).toBe(10);
    const power = run(state, { type: 'discard_drawn' });
    expect(power.phase).toBe('power');
    expect(power.power).toBe('peek_own');
    const seen = run(power, { type: 'power_peek_own', slot: 0 });
    // The card stays revealed to Ben until he ends the turn.
    expect(seen.phase).toBe('reveal');
    expect(seen.revealed).toEqual({ ownerId: 'p2', slot: 0 });
    expect(seen.currentIndex).toBe(1);
    expect(seen.players[1].memory).toContain(4);
    expectError(applyAction(seen, { type: 'draw', source: 'deck' }), 'wrong_phase');
    const done = run(seen, { type: 'end_turn' });
    expect(done.currentIndex).toBe(0);
    expect(done.revealed).toBeNull();
  });

  it('10 peeks one opponent card and rejects the wrong power', () => {
    // Ann discards 4♣; Ben discards 7♣ and skips its power; Ann draws 10♠ and discards it.
    const state = run(
      scenario(),
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expect(state.power).toBe('peek_other');
    expectError(applyAction(state, { type: 'power_peek_own', slot: 0 }), 'no_power');
    const peeked = run(state, { type: 'power_peek_other', targetId: 'p2', slot: 2 });
    expect(peeked.revealed).toEqual({ ownerId: 'p2', slot: 2 });
    const after = run(peeked, { type: 'end_turn' });
    expect(after.players[0].memory).toContain(6);
    expect(after.currentIndex).toBe(1);
  });

  it('blind swap exchanges cards without changing the memory of either player', () => {
    // Ann discards 4♣; Ben discards 7♣ and skips; Ann discards 10♠ and skips; Ben draws J♥.
    const state = run(
      scenario(),
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
      { type: 'draw', source: 'deck' },
    );
    expect(state.drawn?.card.id).toBe(12);
    const discarded = run(state, { type: 'discard_drawn' });
    expect(discarded.power).toBe('blind_swap');

    const before = discarded.players.map((p) => [...p.memory]);
    // Ben (current, p2) swaps own slot 1 (K♥, id 5) with Ann's slot 0 (5♣, id 0).
    const swapped = run(discarded, {
      type: 'power_blind_swap',
      slot: 1,
      targetId: 'p1',
      targetSlot: 0,
    });
    expect(swapped.players[1].hand[1].id).toBe(0);
    expect(swapped.players[0].hand[0].id).toBe(5);
    expect(swapped.players.map((p) => p.memory)).toEqual(before);
  });

  it('skip_power passes the turn without using the power', () => {
    const state = run(
      scenario(),
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
    );
    expect(state.currentIndex).toBe(0);
    expect(state.phase).toBe('turn');
  });

  it('rejects targeting yourself', () => {
    const state = run(
      scenario(),
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
      { type: 'skip_power' },
      { type: 'draw', source: 'deck' },
      { type: 'discard_drawn' },
    );
    expectError(
      applyAction(state, { type: 'power_peek_other', targetId: 'p1', slot: 0 }),
      'invalid_target',
    );
  });
});

describe('deck recycling', () => {
  it('reshuffles the discard pile into the deck when the deck runs out', () => {
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
        c(9, '4', 'clubs'),
      ]),
    });
    const afterAnn = run(state, { type: 'draw', source: 'deck' }, { type: 'discard_drawn' });
    expect(afterAnn.deck).toHaveLength(0);
    expect(afterAnn.discard.map((card) => card.id)).toEqual([8, 9]);

    // Deck empty: the old discard (except its top 9) is reshuffled; Ben draws card 8.
    const withBen = run(afterAnn, { type: 'draw', source: 'deck' });
    expect(withBen.drawn?.card.id).toBe(8);
    expect(withBen.deck).toHaveLength(0);
    expect(withBen.discard.map((card) => card.id)).toEqual([9]);
  });
});
