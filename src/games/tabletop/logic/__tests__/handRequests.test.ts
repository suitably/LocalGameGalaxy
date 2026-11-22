import { describe, it, expect } from 'vitest';
import type { CardWidget, TabletopGameDefinition, TabletopWidget } from '../types';
import type { TabletopAction } from '../tabletopReducer';
import {
  applyHandRequest,
  handCardIds,
  handSeats,
  normalizeAsk,
  randomPick,
  requestKey,
  revealGrants,
  toggleAskedCard,
  type HandRequestOp,
  type HandRequests,
} from '../handRequests';
import { privateCardOwners, redactDelta, redactGame, withGrantChanges } from '../handPrivacy';
import { authorizeSeatIntent, type IntentSender } from '../intentAuthorization';
import { acceptIntent } from '../syncProtocol';
import { seededRng } from '../rng';
import { prepareHostAction } from '../hostActions';
import { tabletopReducer } from '../tabletopReducer';

const card = (id: string): CardWidget =>
  ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 1,
    label: id.toUpperCase(),
    frontContent: { type: 'text', value: id.toUpperCase() },
    backContent: { type: 'text', value: 'BACK' },
    faceUp: true,
    rotation: 0,
  }) as CardWidget;

const hand = (id: string, seat: number, childIds: string[]) =>
  ({
    id,
    type: 'holder',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zIndex: 1,
    isHand: true,
    ownerSeat: seat,
    layout: 'fan',
    dropTargetTypes: ['card'],
    childIds,
  }) as TabletopWidget;

// Three players: seat 0 holds a0..a2, seat 1 b0..b3, seat 2 c0.
const widgetList = [
  ...['a0', 'a1', 'a2', 'b0', 'b1', 'b2', 'b3', 'c0', 't'].map(card),
  hand('h0', 0, ['a0', 'a1', 'a2']),
  hand('h1', 1, ['b0', 'b1', 'b2', 'b3']),
  hand('h2', 2, ['c0']),
];
const widgets = Object.fromEntries(widgetList.map((w) => [w.id, w]));
const game = { id: 'g', widgets } as unknown as TabletopGameDefinition;
const rng = () => seededRng(42);

const run = (ops: HandRequestOp[], start?: HandRequests) =>
  ops.reduce<HandRequests | undefined>((r, op) => applyHandRequest(r, op, widgets, rng()), start);

describe('handRequests: view requests (#557)', () => {
  it('lists hand cards and hand seats', () => {
    expect(handCardIds(widgets, 1)).toEqual(['b0', 'b1', 'b2', 'b3']);
    expect(handCardIds(widgets, 5)).toEqual([]);
    expect(handSeats(widgets)).toEqual([0, 1, 2]);
  });

  it('creates, extends, reduces and withdraws a request by position', () => {
    const key = requestKey('view', 0, 1);
    let r = run([{ op: 'ask', from: 0, to: 1, ask: { mode: 'cards', cardIds: ['b2'] } }]);
    expect(r?.[key]).toEqual({
      kind: 'view',
      from: 0,
      to: 1,
      status: 'pending',
      ask: { mode: 'cards', cardIds: ['b2'] },
    });
    // extend: toggle b0 in, kept in hand order; foreign or unknown cards are dropped
    const extended = toggleAskedCard({ mode: 'cards', cardIds: ['b2', 'a0', 'zz'] }, 'b0');
    r = run([{ op: 'ask', from: 0, to: 1, ask: extended! }], r);
    expect(r?.[key]).toMatchObject({ ask: { mode: 'cards', cardIds: ['b0', 'b2'] } });
    // reduce to nothing withdraws it
    r = run([{ op: 'ask', from: 0, to: 1, ask: { mode: 'cards', cardIds: [] } }], r);
    expect(r).toEqual({});
    // close withdraws too
    r = run([
      { op: 'ask', from: 0, to: 1, ask: { mode: 'count', count: 9 } },
      { op: 'close', from: 0, to: 1, kind: 'view' },
    ]);
    expect(r).toEqual({});
  });

  it('clamps a count ask to the hand and ignores asks to oneself or an empty hand', () => {
    expect(normalizeAsk({ mode: 'count', count: 9 }, ['x', 'y'])).toEqual({
      mode: 'count',
      count: 2,
    });
    expect(normalizeAsk({ mode: 'count', count: 0 }, ['x'])).toBeNull();
    expect(run([{ op: 'ask', from: 1, to: 1, ask: { mode: 'count', count: 1 } }])).toBeUndefined();
    expect(run([{ op: 'ask', from: 0, to: 7, ask: { mode: 'count', count: 1 } }])).toBeUndefined();
  });

  it('keeps one request per requester → owner pair with three players', () => {
    const r = run([
      { op: 'ask', from: 0, to: 1, ask: { mode: 'count', count: 1 } },
      { op: 'ask', from: 2, to: 1, ask: { mode: 'cards', cardIds: ['b3'] } },
      { op: 'ask', from: 1, to: 0, ask: { mode: 'count', count: 2 } },
      { op: 'answer', from: 2, to: 1, kind: 'view', answer: { type: 'accept' } },
    ]);
    expect(Object.keys(r ?? {}).sort()).toEqual(['view:0>1', 'view:1>0', 'view:2>1']);
    expect(r?.['view:2>1']).toMatchObject({ status: 'shown', cardIds: ['b3'] });
    expect(r?.['view:0>1']).toMatchObject({ status: 'pending' });
    // seat 0's grant covers b3 only for seat 2
    const grants = revealGrants(r, privateCardOwners(widgets));
    expect([...grants.entries()]).toEqual([['b3', [2]]]);
  });

  it('answers: reject, random, subset; an empty subset rejects', () => {
    const ask: HandRequestOp = { op: 'ask', from: 0, to: 1, ask: { mode: 'count', count: 2 } };
    const answer = (a: Extract<HandRequestOp, { op: 'answer' }>['answer']) =>
      run([ask, { op: 'answer', from: 0, to: 1, kind: 'view', answer: a }])?.['view:0>1'];
    expect(answer({ type: 'reject' })).toMatchObject({ status: 'rejected' });
    expect(answer({ type: 'subset', cardIds: ['b1', 'a0'] })).toMatchObject({ cardIds: ['b1'] });
    expect(answer({ type: 'subset', cardIds: [] })).toMatchObject({ status: 'rejected' });
    const random = answer({ type: 'random', count: 3 });
    expect(random?.status === 'shown' && random.cardIds).toHaveLength(3);
    // accepting a count ask is a random pick of that many cards, same seed → same pick
    expect(answer({ type: 'accept' })).toEqual(answer({ type: 'accept' }));
    expect(randomPick(['x', 'y', 'z'], 2, seededRng(1))).toHaveLength(2);
  });

  it('an answer needs a pending request; a dismissed result is gone', () => {
    expect(
      run([{ op: 'answer', from: 0, to: 1, kind: 'view', answer: { type: 'accept' } }]),
    ).toBeUndefined();
    const shown = run([
      { op: 'ask', from: 0, to: 1, ask: { mode: 'cards', cardIds: ['b0'] } },
      { op: 'answer', from: 0, to: 1, kind: 'view', answer: { type: 'accept' } },
    ]);
    // a second answer does not change the shown result
    expect(
      run([{ op: 'answer', from: 0, to: 1, kind: 'view', answer: { type: 'reject' } }], shown),
    ).toBe(shown);
    expect(run([{ op: 'close', from: 0, to: 1, kind: 'view' }], shown)).toEqual({});
  });
});

describe('handRequests: authorization (#557)', () => {
  const at = (seat: number | null, spectator = false): IntentSender => ({ spectator, seat });
  const ok = (action: TabletopAction, sender: IntentSender) =>
    authorizeSeatIntent(action, sender, game) && acceptIntent(action, sender, game);
  const req = (payload: HandRequestOp): TabletopAction => ({ type: 'HAND_REQUEST', payload });
  const ask = req({ op: 'ask', from: 0, to: 1, ask: { mode: 'count', count: 1 } });
  const answer = req({ op: 'answer', from: 0, to: 1, kind: 'view', answer: { type: 'accept' } });

  it('only the requester asks or closes, only the owner answers', () => {
    expect(ok(ask, at(0))).toBe(true);
    expect(ok(ask, at(1))).toBe(false);
    expect(ok(ask, at(2))).toBe(false);
    expect(ok(req({ op: 'close', from: 0, to: 1, kind: 'view' }), at(2))).toBe(false);
    expect(ok(answer, at(1))).toBe(true);
    expect(ok(answer, at(0))).toBe(false);
    expect(ok(answer, at(2))).toBe(false);
  });

  it('spectators and seatless devices cannot request; nobody asks themselves', () => {
    expect(ok(ask, at(0, true))).toBe(false);
    expect(ok(ask, at(null))).toBe(false);
    expect(ok(req({ op: 'ask', from: 1, to: 1, ask: { mode: 'count', count: 1 } }), at(1))).toBe(
      false,
    );
  });
});

describe('handRequests: sealed reveal (#557)', () => {
  const step = (g: TabletopGameDefinition, payload: HandRequestOp, seat: number) =>
    tabletopReducer(
      { game: g, flyingCards: [] },
      prepareHostAction({ type: 'HAND_REQUEST', payload }, g, seat, 7),
    ).game;

  it('seals shown faces for the requester only, and takes them back on dismiss', () => {
    const asked = step(
      game,
      { op: 'ask', from: 2, to: 1, ask: { mode: 'cards', cardIds: ['b1'] } },
      2,
    );
    const shown = step(
      asked,
      { op: 'answer', from: 2, to: 1, kind: 'view', answer: { type: 'accept' } },
      1,
    );
    const { game: wire, secrets } = redactGame(shown);
    expect((wire.widgets.b1 as CardWidget).frontContent).toEqual({ type: 'text', value: 'BACK' });
    expect(Object.keys(secrets[2]).sort()).toEqual(['b1', 'c0']); // shown card + own hand
    expect(secrets[0]).toBeDefined(); // own hand only
    expect(secrets[0].b1).toBeUndefined();

    // the answer changes no widget; the delta still carries b1 so seat 2 can open it
    const delta = withGrantChanges({ widgets: {} }, asked, shown);
    expect(Object.keys(delta.widgets)).toEqual(['b1']);
    expect(redactDelta(delta, shown).secrets[2].b1.label).toBe('B1');

    const dismissed = step(shown, { op: 'close', from: 2, to: 1, kind: 'view' }, 2);
    expect(dismissed.handRequests).toEqual({});
    const back = withGrantChanges({ widgets: {} }, shown, dismissed);
    expect(Object.keys(back.widgets)).toEqual(['b1']);
    expect(redactDelta(back, dismissed).secrets[2]).toBeUndefined();
  });

  it('a shown card that left the owner hand is no longer sealed for the requester', () => {
    const requests: HandRequests = {
      'view:0>1': { kind: 'view', from: 0, to: 1, status: 'shown', cardIds: ['t', 'b0'] },
    };
    expect([...revealGrants(requests, privateCardOwners(widgets)).keys()]).toEqual(['b0']);
  });
});
