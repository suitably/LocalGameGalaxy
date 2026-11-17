import { describe, it, expect } from 'vitest';
import { applyAction, canDraw, createGame, isPlayable, playableCards, skatDeck } from './engine';
import type { MauMauAction, MauMauState } from './types';
import { c, makeState } from './testUtils';

const ok = (state: MauMauState, action: MauMauAction, shuffle = <T>(a: T[]) => a) => {
  const r = applyAction(state, action, shuffle);
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

describe('createGame', () => {
  it('deals 5 cards each and one start card from the 32-card deck', () => {
    const g = createGame(['A', 'B', 'C']);
    expect(g.players.every((p) => p.hand.length === 5)).toBe(true);
    expect(g.discard).toHaveLength(1);
    expect(g.deck).toHaveLength(32 - 15 - 1);
    expect(skatDeck()).toHaveLength(32);
  });

  it('rejects invalid player counts', () => {
    expect(() => createGame(['A'])).toThrow();
    expect(() => createGame(['A', 'B', 'C', 'D', 'E', 'F'])).toThrow();
  });

  it('start card has no effect, even a seven', () => {
    const deck = skatDeck().reverse();
    const g = createGame(['A', 'B'], { deck });
    expect(g.pendingDraw).toBe(0);
    expect(g.phase).toBe('turn');
  });
});

describe('playing cards', () => {
  it('matches suit or rank, rejects others', () => {
    const top = c('9', 'hearts');
    const s = makeState(
      [[c('K', 'hearts'), c('9', 'clubs'), c('K', 'clubs')], [c('A', 'clubs')]],
      top,
    );
    expect(playableCards(s).map((x) => x.id)).toEqual([
      s.players[0].hand[0].id,
      s.players[0].hand[1].id,
    ]);
    expect(applyAction(s, { type: 'play', cardId: s.players[0].hand[2].id }).ok).toBe(false);
  });

  it('rejects unknown cards and acting after the round ended', () => {
    const s = makeState([[c('K', 'hearts')], [c('A', 'clubs')]], c('9', 'hearts'));
    expect(applyAction(s, { type: 'play', cardId: 9999 }).ok).toBe(false);
    expect(applyAction({ ...s, phase: 'round_over' }, { type: 'draw' }).ok).toBe(false);
  });

  it('eight skips the next player', () => {
    const eight = c('8', 'hearts');
    const s = makeState(
      [[eight, c('A', 'clubs')], [c('A', 'spades')], [c('K', 'spades')]],
      c('9', 'hearts'),
    );
    expect(ok(s, { type: 'play', cardId: eight.id }).currentIndex).toBe(2);
  });

  it('eight in a two-player game gives the turn back', () => {
    const eight = c('8', 'hearts');
    const s = makeState([[eight, c('A', 'clubs')], [c('A', 'spades')]], c('9', 'hearts'));
    expect(ok(s, { type: 'play', cardId: eight.id }).currentIndex).toBe(0);
  });
});

describe('sevens', () => {
  it('stack and the penalty is 2 per seven; only sevens may answer', () => {
    const s7 = c('7', 'hearts');
    const t7 = c('7', 'clubs');
    const other = c('K', 'hearts');
    const deck = [c('A', 'clubs'), c('A', 'spades'), c('A', 'hearts'), c('A', 'diamonds')];
    let s = makeState(
      [[s7, c('Q', 'spades')], [t7, other], [c('9', 'spades')]],
      c('9', 'hearts'),
      deck,
    );
    s = ok(s, { type: 'play', cardId: s7.id });
    expect(s.pendingDraw).toBe(2);
    expect(playableCards(s).map((x) => x.id)).toEqual([t7.id]);
    expect(applyAction(s, { type: 'play', cardId: other.id }).ok).toBe(false);
    expect(applyAction(s, { type: 'draw' }).ok).toBe(false);
    expect(applyAction(s, { type: 'pass' }).ok).toBe(false);
    s = ok(s, { type: 'play', cardId: t7.id });
    expect(s.pendingDraw).toBe(4);
    expect(s.currentIndex).toBe(2);
    s = ok(s, { type: 'take_penalty' });
    expect(s.players[2].hand).toHaveLength(5);
    expect(s.pendingDraw).toBe(0);
    expect(s.currentIndex).toBe(0);
  });

  it('take_penalty is only allowed with a pending penalty', () => {
    const s = makeState([[c('K', 'hearts')], [c('A', 'clubs')]], c('9', 'hearts'));
    expect(applyAction(s, { type: 'take_penalty' }).ok).toBe(false);
  });

  it('penalty reshuffles the discard pile when the deck runs out', () => {
    const base = makeState(
      [[c('K', 'hearts')], [c('A', 'clubs')]],
      c('7', 'hearts'),
      [c('A', 'spades')],
      {
        pendingDraw: 2,
        currentIndex: 1,
      },
    );
    const s: MauMauState = {
      ...base,
      discard: [c('9', 'clubs'), c('10', 'clubs'), base.discard[0]],
    };
    const after = ok(s, { type: 'take_penalty' });
    expect(after.players[1].hand).toHaveLength(3);
    expect(after.discard).toHaveLength(1);
  });
});

describe('jack and wish', () => {
  it('jack is playable on anything but a jack and requires a wish', () => {
    const jack = c('J', 'clubs');
    const s = makeState(
      [
        [jack, c('A', 'clubs')],
        [c('K', 'spades'), c('A', 'hearts')],
      ],
      c('9', 'hearts'),
    );
    const afterJack = ok(s, { type: 'play', cardId: jack.id });
    expect(afterJack.phase).toBe('wish');
    expect(applyAction(afterJack, { type: 'draw' }).ok).toBe(false);
    const wished = ok(afterJack, { type: 'wish', suit: 'spades' });
    expect(wished.wishedSuit).toBe('spades');
    expect(wished.currentIndex).toBe(1);
    expect(isPlayable(wished, wished.players[1].hand[0])).toBe(true);
    expect(isPlayable(wished, wished.players[1].hand[1])).toBe(false);
    const onJack = makeState([[c('J', 'spades')], [c('A', 'clubs')]], c('J', 'hearts'));
    expect(applyAction(onJack, { type: 'play', cardId: onJack.players[0].hand[0].id }).ok).toBe(
      false,
    );
  });

  it('a jack can be played on a wished jack-free suit and wish clears afterwards', () => {
    const jack = c('J', 'clubs');
    const k = c('K', 'spades');
    let s = makeState([[c('A', 'hearts')], [k, jack]], c('J', 'hearts'), [], {
      wishedSuit: 'spades',
      currentIndex: 1,
    });
    expect(isPlayable(s, jack)).toBe(false); // top is a jack
    s = { ...s, discard: [c('9', 'spades')] };
    expect(isPlayable(s, jack)).toBe(true);
    s = ok({ ...s, wishedSuit: 'spades' }, { type: 'play', cardId: k.id });
    expect(s.wishedSuit).toBeNull();
  });

  it('a jack as last card wins without a wish', () => {
    const jack = c('J', 'clubs');
    const s = makeState([[jack], [c('A', 'clubs')]], c('9', 'hearts'));
    const after = ok(s, { type: 'play', cardId: jack.id });
    expect(after.phase).toBe('round_over');
    expect(after.winnerId).toBe('p1');
    expect(after.players[0].wins).toBe(1);
  });
});

describe('drawing and passing', () => {
  it('draw shows the card in phase drawn; only the drawn card may be played', () => {
    const drawnPlayable = c('K', 'hearts');
    const s = makeState(
      [[c('A', 'clubs'), c('9', 'spades')], [c('A', 'spades')]],
      c('9', 'hearts'),
      [drawnPlayable],
    );
    const drew = ok(s, { type: 'draw' });
    expect(drew.phase).toBe('drawn');
    expect(drew.currentIndex).toBe(0);
    expect(playableCards(drew)).toEqual([drawnPlayable]);
    expect(applyAction(drew, { type: 'play', cardId: s.players[0].hand[1].id }).ok).toBe(false);
    expect(applyAction(drew, { type: 'draw' }).ok).toBe(false);
    expect(ok(drew, { type: 'pass' }).currentIndex).toBe(1);
    expect(ok(drew, { type: 'play', cardId: drawnPlayable.id }).currentIndex).toBe(1);
  });

  it('pass is illegal before drawing while cards can be drawn', () => {
    const s = makeState([[c('A', 'clubs')], [c('A', 'spades')]], c('9', 'hearts'), [
      c('K', 'clubs'),
    ]);
    expect(canDraw(s)).toBe(true);
    expect(applyAction(s, { type: 'pass' }).ok).toBe(false);
  });

  it('with nothing to draw the player may pass', () => {
    const s = makeState([[c('A', 'clubs')], [c('A', 'spades')]], c('9', 'hearts'));
    expect(canDraw(s)).toBe(false);
    expect(ok(s, { type: 'pass' }).currentIndex).toBe(1);
  });

  it('draw reshuffles the discard pile except the top card', () => {
    const base = makeState([[c('A', 'clubs')], [c('A', 'spades')]], c('9', 'hearts'));
    const s: MauMauState = {
      ...base,
      discard: [c('K', 'clubs'), c('Q', 'clubs'), base.discard[0]],
    };
    const drew = ok(s, { type: 'draw' });
    expect(drew.players[0].hand).toHaveLength(2);
    expect(drew.discard).toHaveLength(1);
    expect(drew.deck).toHaveLength(1);
  });
});

describe('rounds', () => {
  it('first empty hand wins, next round rotates the start and keeps wins', () => {
    const last = c('9', 'clubs');
    let s = makeState([[last], [c('A', 'clubs'), c('K', 'clubs')]], c('9', 'hearts'));
    s = ok(s, { type: 'play', cardId: last.id });
    expect(s.phase).toBe('round_over');
    expect(applyAction(s, { type: 'play', cardId: 1 }).ok).toBe(false);
    const next = ok(s, { type: 'next_round' });
    expect(next.roundNumber).toBe(2);
    expect(next.currentIndex).toBe(1);
    expect(next.players.map((p) => p.wins)).toEqual([1, 0]);
    expect(next.players.every((p) => p.hand.length === 5)).toBe(true);
    expect(applyAction(next, { type: 'next_round' }).ok).toBe(false);
  });
});
