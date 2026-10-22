import { describe, it, expect } from 'vitest';
import { PrivateHandChannel } from '../privateHandChannel';
import type { CardWidget, TabletopGameDefinition, TabletopWidget } from '../types';

const card = (id: string, front: string) =>
  ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zIndex: 1,
    frontContent: { type: 'text', value: front },
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
const game = {
  id: 'g',
  widgets: {
    a: card('a', 'Ace'),
    k: card('k', 'King'),
    h0: hand('h0', 0, ['a']),
    h1: hand('h1', 1, ['k']),
  },
} as unknown as TabletopGameDefinition;
const front = (w: unknown) => (w as CardWidget).frontContent.value;

describe('PrivateHandChannel (#449)', () => {
  it('each seat sees only its own hand; a listener without a seat sees none', async () => {
    const host = new PrivateHandChannel();
    const seat0 = new PrivateHandChannel();
    const seat1 = new PrivateHandChannel();
    await host.registerSeat(0, (await seat0.publicKey())!);
    await host.registerSeat(1, (await seat1.publicKey())!);

    const snap = await host.outgoingSnapshot(game);
    expect(JSON.stringify(snap.state)).not.toContain('Ace');

    await seat0.acceptHostKey(snap.hostKey);
    await seat1.acceptHostKey(snap.hostKey);
    const view0 = await seat0.open(snap.state.widgets, snap.sealed, 0);
    const view1 = await seat1.open(snap.state.widgets, snap.sealed, 1);
    expect([front(view0.a), front(view0.k)]).toEqual(['Ace', 'BACK']);
    expect([front(view1.a), front(view1.k)]).toEqual(['BACK', 'King']);
    // A device claiming seat 0 with its own key cannot open seat 0's box.
    expect(front((await seat1.open(snap.state.widgets, snap.sealed, 0)).a)).toBe('BACK');

    const d = await host.outgoingDelta({ widgets: { a: game.widgets.a } }, game);
    expect(front(d.delta.widgets.a)).toBe('BACK');
    expect(front((await seat0.open(d.delta.widgets, d.sealed, 0)).a)).toBe('Ace');
  });

  it('passes data through unchanged when no seat registered or no WebCrypto', async () => {
    const host = new PrivateHandChannel();
    expect((await host.outgoingSnapshot(game)).state).toBe(game);
    const plain = new PrivateHandChannel(false);
    await plain.registerSeat(0, {});
    expect((await plain.outgoingDelta({ widgets: {} }, game)).sealed).toBeUndefined();
  });
});
