import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { skat, type SkatState } from '../skat';
import {
  BID_VALUES,
  legalCards,
  matadors,
  nextBid,
  scoreGame,
  trickWinner,
  type SkatGame,
} from '../skatRules';

const suitGame = (type: SkatGame['type'], hand = false): SkatGame => ({
  type,
  hand,
  ouvert: false,
});

describe('Skat rules', () => {
  it('bids along the official values', () => {
    expect(BID_VALUES.slice(0, 12)).toEqual([18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44]);
    expect(nextBid(0)).toBe(18);
    expect(nextBid(24)).toBe(27);
    expect(BID_VALUES[BID_VALUES.length - 1]).toBe(264);
  });

  it('follows suit with jacks as trumps', () => {
    const hand = ['CJ', 'H7', 'HA', 'D10'];
    expect(legalCards(hand, 'HK', 'S')).toEqual(['H7', 'HA']);
    expect(legalCards(hand, 'S9', 'S')).toEqual(['CJ']);
    expect(legalCards(hand, 'HJ', 'grand')).toEqual(['CJ']);
    expect(legalCards(hand, 'C9', 'grand')).toEqual(hand);
    // null: the jack is a plain heart/club
    expect(legalCards(hand, 'CA', 'null')).toEqual(['CJ']);
  });

  it('finds the trick winner', () => {
    expect(trickWinner(['HK', 'H10', 'HA'], 'S')).toBe(2);
    expect(trickWinner(['HK', 'S7', 'HA'], 'S')).toBe(1);
    expect(trickWinner(['S7', 'DJ', 'SA'], 'S')).toBe(1);
    expect(trickWinner(['DJ', 'CJ', 'SJ'], 'grand')).toBe(1);
    expect(trickWinner(['HK', 'DA', 'CA'], 'grand')).toBe(0);
    expect(trickWinner(['H10', 'HJ', 'H9'], 'null')).toBe(1);
  });

  it('counts matadors with and without', () => {
    expect(matadors(['CJ', 'SJ', 'DJ', 'HA'], 'H')).toBe(2);
    expect(matadors(['HJ', 'HA'], 'H')).toBe(2);
    expect(matadors(['CJ', 'SJ', 'HJ', 'DJ', 'HA', 'H10', 'HQ'], 'H')).toBe(6);
    expect(matadors(['S7'], 'grand')).toBe(4);
  });

  const base = { declarer: 0, bid: 18, declarerTricks: 6, tricksPlayed: 10 };
  it('scores won, lost, schneider, hand and overbid games', () => {
    const cards = ['CJ', 'SJ', 'HA', 'H10'];
    // with 2, game 3 × hearts 10; 61 points needed
    const taken61 = ['CA', 'C10', 'SA', 'S10', 'HA', 'DK', 'HK'];
    expect(scoreGame({ ...base, game: suitGame('H'), cards, taken: taken61 })).toMatchObject({
      points: 61,
      won: true,
      value: 30,
      schneider: false,
    });
    expect(
      scoreGame({ ...base, game: suitGame('H', true), cards, taken: ['CA', 'C10'] }),
    ).toMatchObject({ won: false, value: 50, schneider: true });
    expect(
      scoreGame({ ...base, bid: 33, game: suitGame('H'), cards, taken: taken61 }),
    ).toMatchObject({ won: false, overbid: true, value: 40 });
    expect(
      scoreGame({ ...base, game: suitGame('grand'), cards, taken: taken61, declarerTricks: 10 }),
    ).toMatchObject({ won: true, schwarz: true, value: 24 * 5 });
    const nullGame: SkatGame = { type: 'null', hand: false, ouvert: true };
    expect(
      scoreGame({ ...base, game: nullGame, cards, taken: [], declarerTricks: 0 }),
    ).toMatchObject({ won: true, value: 46 });
  });
});

describe('Skat round', () => {
  const rng = seededRng(4);
  const act = (s: SkatState, seat: number, id: string, arg?: string | number) =>
    skat.move(s, seat, { kind: 'action', id, arg }, rng);
  const fresh = () => ({ ...skat.start(3, rng), dealer: 2 }) as SkatState;
  // dealer 2: forehand 0, middlehand 1, rearhand 2
  const start = (): SkatState => ({
    ...fresh(),
    bidding: { value: 0, speaker: 1, listener: 0, turn: 'speaker', stage: 1 },
    turn: 1,
  });

  it('runs the bidding: middlehand to forehand, then rearhand to the winner', () => {
    let s = start();
    expect(act(s, 0, 'pass')).toBe(s);
    expect(act(s, 1, 'bid', 19)).toBe(s);
    s = act(s, 1, 'bid', 18);
    s = act(s, 0, 'hold');
    s = act(s, 1, 'pass');
    expect(s.bidding).toMatchObject({ stage: 2, speaker: 2, listener: 0, value: 18 });
    expect(act(s, 2, 'bid', 18)).toBe(s);
    s = act(s, 2, 'bid', 20);
    s = act(s, 0, 'pass');
    expect(s.phase).toBe('pickup');
    expect(s.declarer).toBe(2);
  });

  it('throws the hand in when all three pass, and forehand may play at 18', () => {
    let s = act(act(start(), 1, 'pass'), 2, 'pass');
    expect(s.bidding.stage).toBe(3);
    expect(s.turn).toBe(0);
    const thrown = act(s, 0, 'pass');
    expect(thrown.phase).toBe('roundEnd');
    expect(thrown.result).toBeNull();
    expect(skat.view(thrown, 0).summary?.title).toMatchObject({ key: 'skat.passedIn' });
    s = act(s, 0, 'bid', 18);
    expect(s.declarer).toBe(0);
  });

  it('picks up, discards two, declares and plays; forehand leads', () => {
    let s = act(act(act(start(), 1, 'pass'), 2, 'pass'), 0, 'bid', 18);
    s = act(s, 0, 'pickup');
    expect(s.hands[0]).toHaveLength(12);
    const two = s.hands[0].slice(0, 2);
    expect(skat.move(s, 0, { kind: 'cards', cards: [two[0]] }, rng)).toBe(s);
    s = skat.move(s, 0, { kind: 'cards', cards: two }, rng);
    expect(s.skat).toEqual(two);
    s = act(s, 0, 'declare', 'grand');
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(0);
    expect(s.game).toEqual({ type: 'grand', hand: false, ouvert: false });
  });

  it('keeps hand games and shows an open null hand to everyone', () => {
    let s = act(act(act(start(), 1, 'pass'), 2, 'pass'), 0, 'bid', 18);
    s = act(s, 0, 'hand');
    expect(skat.view(s, 0).actions.map((a) => a.arg)).toContain('nullOuvert');
    s = act(s, 0, 'declare', 'nullOuvert');
    expect(s.game).toEqual({ type: 'null', hand: true, ouvert: true });
    expect(skat.view(s, 1).seats[0].revealed).toHaveLength(10);
    expect(skat.view(s, 1).seats[1].revealed).toBeUndefined();
  });
});
