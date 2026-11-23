import { describe, expect, it } from 'vitest';
import { seededRng } from '../../../logic/rng';
import { durak, transferCards, type DurakState } from '../durak';
import { canRenewMiddle, schwimmen, type SchwimmenState } from '../schwimmen';
import { canPlayOn, maumau, type MauMauState } from '../maumau';
import { emptySession, sessionAllows, sessionReducer } from '../session';
import { seatPacket } from '../sealedViews';
import { optionOn, resolveOptions, type ScriptMove } from '../scriptTypes';

const rng = seededRng(1);
const act = (id: string, arg?: string) =>
  ({ kind: 'action', id, ...(arg ? { arg } : {}) }) as const;
const actionIds = (view: { actions: { id: string }[] }) => view.actions.map((a) => a.id);

describe('table settings', () => {
  it('fills missing choices with the declared defaults', () => {
    const declared = [
      { id: 'a', label: 'a', default: true },
      { id: 'b', label: 'b' },
    ];
    expect(resolveOptions(declared, {})).toEqual({ a: true, b: false });
    expect(resolveOptions(declared, { a: false, x: true })).toEqual({ a: false, b: false });
    expect(optionOn(declared, undefined, 'a')).toBe(true);
  });

  it('keeps the options in the session, changes them mid-game, host only', () => {
    const players = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
    const started = sessionReducer(emptySession('maumau'), {
      type: 'START',
      scriptId: 'maumau',
      players,
      seed: 4,
      options: { eightCounter: true },
    });
    expect(started.options).toEqual({
      eightSkips: true,
      eightCounter: true,
      drawPlay: true,
      playOn: true,
    });
    const changed = sessionReducer(started, { type: 'OPTIONS', options: { drawPlay: false } });
    expect((changed.game as MauMauState).rules?.drawPlay).toBe(false);
    expect((changed.game as MauMauState).rules?.eightCounter).toBe(false);
    expect(changed.step).toBe(started.step + 1);
    expect(seatPacket(changed, 0).options?.drawPlay).toBe(false);
    const action = { type: 'OPTIONS', options: {} } as const;
    expect(sessionAllows(changed, action, 'b', 'a')).toBe(false);
    expect(sessionAllows(changed, action, 'a', 'a')).toBe(true);
    expect(sessionReducer(emptySession('maumau'), action).game).toBeNull();
  });
});

describe('Durak table settings (#796)', () => {
  const bout = (over: Partial<DurakState> = {}): DurakState => ({
    hands: [
      ['H6', 'D9', 'C9'],
      ['S6', 'H7', 'D10'],
      ['C6', 'H9', 'DA', 'CK'],
      ['C7', 'C8', 'CA'],
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
    losses: [0, 0, 0, 0],
    last: null,
    rules: { transfer: true, neighbours: true },
    ...over,
  });

  it('passes the attack on with a card of the same rank before any defence', () => {
    let s = durak.move(bout(), 0, { kind: 'cards', cards: ['H6'] }, rng);
    expect(transferCards(s)).toEqual(['S6']);
    expect(actionIds(durak.view(s, 1))).toEqual(['transfer', 'take']);
    s = durak.move(s, 1, act('transfer', 'S6'), rng);
    expect(s.defender).toBe(2);
    expect(s.attacker).toBe(1);
    expect(s.turn).toBe(2);
    expect(s.table.map((p) => p.attack)).toEqual(['H6', 'S6']);
    // seat 2 passes it on again with its six; seat 3 holds three cards for three attacks
    expect(transferCards(s)).toEqual(['C6']);
    s = durak.move(s, 2, act('transfer', 'C6'), rng);
    expect(s.defender).toBe(3);
    expect(s.limit).toBe(3);
    expect(transferCards(s)).toEqual([]);
  });

  it('refuses passing on once a card is beaten, or when it is switched off', () => {
    let s = durak.move(bout(), 0, { kind: 'cards', cards: ['H6'] }, rng);
    expect(durak.move(s, 1, act('transfer', 'H7'), rng)).toBe(s);
    const off = durak.configure!(s, { transfer: false, neighbours: true });
    expect(transferCards(off)).toEqual([]);
    s = durak.move(s, 1, { kind: 'cards', cards: ['H7'], target: 'H6' }, rng);
    expect(transferCards(s)).toEqual([]);
  });

  it('lets only the neighbours of the defender throw in', () => {
    // seat 0 attacks seat 1; seat 3 holds a six but is no neighbour of the defender
    let s = durak.move(
      bout({ hands: [['H6', 'C9'], ['H8', 'D10', 'S9'], ['DA', 'CK'], ['C6']] }),
      0,
      { kind: 'cards', cards: ['H6'] },
      rng,
    );
    s = durak.move(s, 1, { kind: 'cards', cards: ['H8'], target: 'H6' }, rng);
    expect(s.last).toBe('beaten');
    const all = durak.configure!(
      durak.move(
        bout({ hands: [['H6', 'C9'], ['H8', 'D10', 'S9'], ['DA', 'CK'], ['C6']] }),
        0,
        { kind: 'cards', cards: ['H6'] },
        rng,
      ),
      { transfer: false, neighbours: false },
    );
    const next = durak.move(all, 1, { kind: 'cards', cards: ['H8'], target: 'H6' }, rng);
    expect(next.turn).toBe(3);
  });
});

describe('Schwimmen new middle on 7-8-9 (#797)', () => {
  const table = (middle: string[], over: Partial<SchwimmenState> = {}): SchwimmenState => {
    const s = schwimmen.start(3, seededRng(2));
    return { ...s, phase: 'play', turn: 1, middle, extra: [], ...over };
  };

  it('replaces the middle once per turn, then the turn goes on', () => {
    const s = table(['H7', 'C8', 'S9']);
    expect(canRenewMiddle(s)).toBe(true);
    expect(actionIds(schwimmen.view(s, 1))).toContain('newMiddle');
    const next = schwimmen.move(s, 1, act('newMiddle'), rng);
    expect(next.middle).toEqual(s.stock.slice(0, 3));
    expect(next.turn).toBe(1);
    expect(schwimmen.move(next, 1, act('newMiddle'), rng)).toBe(next);
  });

  it('is offered only for 7, 8 and 9 and when switched on', () => {
    expect(canRenewMiddle(table(['H7', 'C8', 'SA']))).toBe(false);
    const off = schwimmen.configure!(table(['H7', 'C8', 'S9']), { newMiddle: false });
    expect(canRenewMiddle(off)).toBe(false);
  });
});

describe('Mau-Mau table settings (#799)', () => {
  const table = (over: Partial<MauMauState>): MauMauState => ({
    wins: [0, 0, 0],
    round: 1,
    phase: 'turn',
    hands: [
      ['H8', 'S8', 'DJ'],
      ['HK', 'C8', 'C9'],
      ['C10', 'S9', 'S7'],
    ],
    stock: ['DA', 'D10', 'D9'],
    discard: ['H9'],
    turn: 0,
    pendingDraw: 0,
    wishedSuit: null,
    drawn: null,
    winner: null,
    rules: { eightSkips: true, eightCounter: true, drawPlay: true, playOn: true },
    ...over,
  });
  const play = (card: string): ScriptMove => ({ kind: 'cards', cards: [card] });

  it('passes an 8 on with an 8, or the skipped seat sits out', () => {
    let s = maumau.move(table({}), 0, play('H8'), rng);
    expect(s.turn).toBe(1);
    expect(s.pendingSkip).toBe(true);
    expect(actionIds(maumau.view(s, 1))).toEqual(['skip']);
    expect(maumau.move(s, 1, play('C9'), rng)).toBe(s);
    s = maumau.move(s, 1, play('C8'), rng);
    expect(s.turn).toBe(2);
    s = maumau.move(s, 2, act('skip'), rng);
    expect(s.turn).toBe(0);
    expect(s.pendingSkip).toBe(false);
  });

  it('skips at once without the counter rule, and not at all without eightSkips', () => {
    const rules = { eightSkips: true, eightCounter: false, drawPlay: true, playOn: true };
    expect(maumau.move(table({ rules }), 0, play('H8'), rng).turn).toBe(2);
    const plain = { ...rules, eightSkips: false };
    expect(maumau.move(table({ rules: plain }), 0, play('H8'), rng).turn).toBe(1);
  });

  it('ends the turn after drawing when drawPlay is off', () => {
    const rules = { eightSkips: true, eightCounter: false, drawPlay: false, playOn: true };
    const s = maumau.move(table({ rules }), 0, act('draw'), rng);
    expect(s.turn).toBe(1);
    expect(s.hands[0]).toHaveLength(4);
  });

  it('asks to play on after the first win and ranks everyone', () => {
    const hands = [['H10'], ['HK', 'C9'], ['H9', 'C7']];
    let s = maumau.move(table({ hands }), 0, play('H10'), rng);
    expect(s.phase).toBe('roundEnd');
    expect(canPlayOn(s)).toBe(true);
    expect(actionIds(maumau.view(s, null))).toEqual(['continue', 'next']);
    s = maumau.move(s, 2, act('continue'), rng);
    expect(s.phase).toBe('turn');
    expect(s.turn).toBe(1);
    s = maumau.move(s, 1, play('HK'), rng);
    expect(s.turn).toBe(2);
    s = maumau.move(s, 2, play('H9'), rng);
    s = maumau.move(s, 1, play('C9'), rng);
    expect(s.phase).toBe('roundEnd');
    expect(s.finished).toEqual([0, 1]);
    expect(s.wins).toEqual([1, 0, 0]);
    expect(canPlayOn(s)).toBe(false);
    const rows = maumau.view(s, null).summary!.rows;
    expect(rows[2].value).toEqual({ key: 'maumau.place', params: { place: 3 } });
  });
});
