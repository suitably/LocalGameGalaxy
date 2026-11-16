import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { makeDeck, RANKS_32, RANKS_36, RANKS_52 } from '../cardDeck';
import { arschloch, titleOf, type ArschlochState } from '../arschloch';
import { beats, durak, type DurakState } from '../durak';
import { schwimmen, schwimmenScore, type SchwimmenState } from '../schwimmen';
import { getScript, SCRIPTED_GAME_IDS } from '../scriptRegistry';
import { emptySession, moveAllowed, seatPlayers, sessionAllows, sessionReducer } from '../session';
import { playRounds } from './playthrough';

const sorted = (cards: string[]) => [...cards].sort();

describe('scripted games: random playthroughs', () => {
  const cases: [string, number[]][] = [
    ['schwimmen', [2, 4, 9]],
    ['durak', [2, 3, 6]],
    ['arschloch', [3, 4, 6]],
    ['skat', [3]],
  ];
  for (const [id, counts] of cases) {
    for (const players of counts) {
      it(`${id} with ${players} players always has a legal move and ends its rounds`, () => {
        const script = getScript(id)!;
        for (const seed of [1, 7, 42]) {
          expect(() => playRounds(script, players, seed, 4)).not.toThrow();
        }
      });
    }
  }

  it('keeps every card exactly once (Durak, Arschloch)', () => {
    for (const state of playRounds(getScript('durak')!, 4, 3, 2) as DurakState[]) {
      const table = state.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]);
      const all = [...state.hands.flat(), ...state.stock, ...table];
      expect(new Set(all).size).toBe(all.length);
      expect(all.length).toBeLessThanOrEqual(RANKS_36.length * 4);
    }
    for (const state of playRounds(getScript('arschloch')!, 5, 3, 2) as ArschlochState[]) {
      const all = state.hands.flat();
      expect(new Set(all).size).toBe(all.length);
      if (state.phase === 'exchange') expect(sorted(all)).toEqual(sorted(makeDeck(RANKS_52)));
    }
  });

  it('never shows another seat its hand before the round is over', () => {
    for (const id of SCRIPTED_GAME_IDS) {
      const script = getScript(id)!;
      const state = script.start(3, seededRng(5));
      const table = script.view(state, null);
      expect(table.hand).toEqual([]);
      expect(table.seats.every((seat) => !seat.revealed)).toBe(true);
    }
  });
});

describe('Schwimmen', () => {
  it('scores suits, three of a kind and three aces', () => {
    expect(schwimmenScore(['HA', 'HK', 'H10'])).toBe(31);
    expect(schwimmenScore(['HA', 'SK', 'D7'])).toBe(11);
    expect(schwimmenScore(['H9', 'S9', 'D9'])).toBe(30.5);
    expect(schwimmenScore(['HA', 'SA', 'DA'])).toBe(33);
    expect(schwimmenScore(['H7', 'H8', 'S10'])).toBe(15);
  });

  const table = (over: Partial<SchwimmenState>): SchwimmenState => ({
    lives: [3, 3, 3],
    dealer: 0,
    phase: 'play',
    hands: [
      ['H7', 'S8', 'D9'],
      ['HK', 'HQ', 'C7'],
      ['C8', 'C9', 'S7'],
    ],
    extra: [],
    middle: ['HA', 'D7', 'D8'],
    stock: makeDeck(RANKS_32).slice(0, 6),
    turn: 1,
    knocker: null,
    passes: 0,
    result: null,
    ...over,
  });
  const rng = seededRng(1);

  it('ends the round at once on 31: everyone else loses a life', () => {
    const next = schwimmen.move(table({}), 1, { kind: 'cards', cards: ['C7'], target: 'HA' }, rng);
    expect(next.phase).toBe('roundEnd');
    expect(next.result?.fire).toBe(1);
    expect(next.lives).toEqual([2, 3, 2]);
  });

  it('lets everyone play once more after a knock, then the lowest hand loses', () => {
    let s = schwimmen.move(table({}), 1, { kind: 'action', id: 'knock' }, rng);
    expect(s.turn).toBe(2);
    expect(schwimmen.move(s, 2, { kind: 'action', id: 'knock' }, rng)).toBe(s);
    s = schwimmen.move(s, 2, { kind: 'action', id: 'pass' }, rng);
    s = schwimmen.move(s, 0, { kind: 'action', id: 'pass' }, rng);
    expect(s.phase).toBe('roundEnd');
    expect(s.result?.losers).toEqual([0]);
    expect(s.lives).toEqual([2, 3, 3]);
  });

  it('replaces the middle when everyone passed and rejects moves out of turn', () => {
    let s = table({});
    expect(schwimmen.move(s, 0, { kind: 'action', id: 'pass' }, rng)).toBe(s);
    for (const seat of [1, 2, 0]) s = schwimmen.move(s, seat, { kind: 'action', id: 'pass' }, rng);
    expect(s.middle).toEqual(makeDeck(RANKS_32).slice(0, 3));
    expect(s.stock).toHaveLength(3);
  });

  it('swimming players go out with the next lost round; the last one wins the match', () => {
    const s = table({
      lives: [0, -1, 1],
      hands: [['H7', 'S8', 'D9'], [], ['C8', 'C9', 'S7']],
      turn: 2,
    });
    const next = schwimmen.move(s, 2, { kind: 'action', id: 'knock' }, rng);
    const end = schwimmen.move(next, 0, { kind: 'action', id: 'pass' }, rng);
    expect(end.lives).toEqual([-1, -1, 1]);
    expect(end.phase).toBe('matchEnd');
  });
});

describe('Durak', () => {
  it('beats with a higher card of the suit or with a trump', () => {
    expect(beats('H10', 'H9', 'S')).toBe(true);
    expect(beats('H8', 'H9', 'S')).toBe(false);
    expect(beats('S6', 'HA', 'S')).toBe(true);
    expect(beats('D9', 'H7', 'S')).toBe(false);
    expect(beats('S7', 'S9', 'S')).toBe(false);
  });

  const bout = (over: Partial<DurakState> = {}): DurakState => ({
    hands: [
      ['H6', 'D6', 'C9'],
      ['H7', 'S6', 'D10'],
      ['C6', 'H9', 'DA'],
    ],
    stock: [],
    trump: 'S',
    table: [],
    attacker: 0,
    defender: 1,
    turn: 0,
    passed: [],
    limit: 3,
    phase: 'play',
    durak: null,
    losses: [0, 0, 0],
    last: null,
    ...over,
  });
  const rng = seededRng(1);

  it('attack, defence, throw-in and a beaten bout', () => {
    let s = durak.move(bout(), 0, { kind: 'cards', cards: ['H6', 'D6'] }, rng);
    expect(s.turn).toBe(1);
    expect(durak.move(s, 1, { kind: 'cards', cards: ['H7'], target: 'D6' }, rng)).toBe(s);
    s = durak.move(s, 1, { kind: 'cards', cards: ['H7'], target: 'H6' }, rng);
    s = durak.move(s, 1, { kind: 'cards', cards: ['D10'] }, rng);
    // seat 0 has nothing to add (C9), seat 2 may add its six
    expect(s.turn).toBe(2);
    expect(durak.move(s, 2, { kind: 'cards', cards: ['DA'] }, rng)).toBe(s);
    s = durak.move(s, 2, { kind: 'cards', cards: ['C6'] }, rng);
    s = durak.move(s, 1, { kind: 'cards', cards: ['S6'] }, rng);
    // the defender is out of cards: beaten, and the next player with cards attacks
    expect(s.table).toEqual([]);
    expect(s.last).toBe('beaten');
    expect(s.attacker).toBe(2);
    expect(s.defender).toBe(0);
  });

  it('taking skips the defender and the last player with cards is the durak', () => {
    let s = durak.move(bout(), 0, { kind: 'cards', cards: ['C9'] }, rng);
    s = durak.move(s, 1, { kind: 'action', id: 'take' }, rng);
    expect(s.hands[1]).toHaveLength(4);
    expect(s.attacker).toBe(2);
    const end = durak.move(
      bout({ hands: [['H6'], ['H7', 'D10'], []] }),
      0,
      { kind: 'cards', cards: ['H6'] },
      rng,
    );
    const done = durak.move(end, 1, { kind: 'cards', cards: ['H7'] }, rng);
    expect(done.phase).toBe('roundEnd');
    expect(done.durak).toBe(1);
    expect(done.losses).toEqual([0, 1, 0]);
  });
});

describe('Arschloch', () => {
  const round = (over: Partial<ArschlochState> = {}): ArschlochState => ({
    ranks: RANKS_32,
    hands: [
      ['H7', 'D7', 'CK'],
      ['H9', 'D9', 'CA'],
      ['H8', 'S8', 'C10'],
    ],
    turn: 0,
    pile: [],
    top: null,
    passed: [],
    finished: [],
    order: null,
    phase: 'play',
    exchange: [],
    scores: [0, 0, 0],
    ...over,
  });
  const rng = seededRng(1);

  it('needs as many cards of a higher rank; a pass lasts for the trick', () => {
    let s = arschloch.move(round(), 0, { kind: 'cards', cards: ['H7', 'D7'] }, rng);
    expect(arschloch.move(s, 1, { kind: 'cards', cards: ['CA'] }, rng)).toBe(s);
    expect(arschloch.move(s, 1, { kind: 'cards', cards: ['H9', 'CA'] }, rng)).toBe(s);
    s = arschloch.move(s, 1, { kind: 'action', id: 'pass' }, rng);
    s = arschloch.move(s, 2, { kind: 'cards', cards: ['H8', 'S8'] }, rng);
    // seat 0 passes, seat 1 already passed: seat 2 leads the next trick
    s = arschloch.move(s, 0, { kind: 'action', id: 'pass' }, rng);
    expect(s.turn).toBe(2);
    expect(s.top).toBeNull();
    expect(arschloch.move(s, 2, { kind: 'action', id: 'pass' }, rng)).toBe(s);
  });

  it('scores by finishing order and swaps cards before the next round', () => {
    const s = round({ hands: [['CK'], ['CA'], ['H8', 'S8']], turn: 0 });
    let end = arschloch.move(s, 0, { kind: 'cards', cards: ['CK'] }, rng);
    end = arschloch.move(end, 1, { kind: 'cards', cards: ['CA'] }, rng);
    expect(end.phase).toBe('roundEnd');
    expect(end.finished).toEqual([0, 1, 2]);
    expect(end.scores).toEqual([2, 1, 0]);
    const next = arschloch.move(end, 0, { kind: 'action', id: 'next' }, rng);
    expect(next.phase).toBe('exchange');
    expect(next.turn).toBe(0);
    expect(next.hands[0].length - next.hands[2].length).toBeGreaterThanOrEqual(1);
    const back = arschloch.move(next, 0, { kind: 'cards', cards: [next.hands[0][0]] }, rng);
    expect(back.phase).toBe('play');
    expect(back.turn).toBe(2);
    expect(titleOf(0, 5).key).toBe('arschloch.president');
    expect(titleOf(3, 5).key).toBe('arschloch.viceArschloch');
    expect(titleOf(2, 5).key).toBe('arschloch.citizen');
  });
});

describe('session', () => {
  const players = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() }));

  it('starts only with a fitting number of players and is deterministic', () => {
    const empty = emptySession('skat');
    expect(
      sessionReducer(empty, {
        type: 'START',
        scriptId: 'skat',
        players: players.slice(0, 2),
        seed: 1,
      }),
    ).toBe(empty);
    const a = sessionReducer(empty, { type: 'START', scriptId: 'skat', players, seed: 9 });
    const b = sessionReducer(empty, { type: 'START', scriptId: 'skat', players, seed: 9 });
    expect(a.game).toEqual(b.game);
    expect(seatPlayers('skat', [...players, { id: 'd', name: 'D' }])).toHaveLength(3);
    expect(seatPlayers('skat', players.slice(0, 2))).toBeNull();
  });

  it('counts accepted moves only and lets players move their own seat', () => {
    const s = sessionReducer(emptySession('skat'), {
      type: 'START',
      scriptId: 'skat',
      players,
      seed: 9,
    });
    const seat = getScript('skat')!.view(s.game, null).active[0];
    const other = (seat + 1) % 3;
    const pass = { kind: 'action', id: 'pass' } as const;
    expect(sessionReducer(s, { type: 'MOVE', seat: other, move: pass })).toBe(s);
    expect(moveAllowed(s, seat, pass)).toBe(true);
    expect(sessionReducer(s, { type: 'MOVE', seat, move: pass }).step).toBe(1);
    expect(sessionAllows(s, { type: 'MOVE', seat: 1, move: pass }, 'b', 'a')).toBe(true);
    expect(sessionAllows(s, { type: 'MOVE', seat: 2, move: pass }, 'b', 'a')).toBe(false);
    expect(sessionAllows(s, { type: 'END' }, 'b', 'a')).toBe(false);
    expect(sessionAllows(s, { type: 'END' }, 'a', 'a')).toBe(true);
  });
});
