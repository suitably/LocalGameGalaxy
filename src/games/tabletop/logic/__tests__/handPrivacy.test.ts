import { describe, it, expect } from 'vitest';
import { privateCardOwners, redactDelta, redactGame, restoreCards } from '../handPrivacy';
import { deriveSealKey, exportPublicKey, generateSealKeyPair, seal, unseal } from '../sealCrypto';
import type { CardWidget, TabletopGameDefinition, TabletopWidget } from '../types';

const card = (id: string, front: string): CardWidget =>
  ({
    id,
    type: 'card',
    x: 0,
    y: 0,
    width: 80,
    height: 120,
    zIndex: 1,
    label: front,
    frontContent: { type: 'text', value: front },
    backContent: { type: 'text', value: 'BACK' },
    faceUp: true,
    rotation: 0,
  }) as CardWidget;

const hand = (id: string, seat: number | undefined, childIds: string[]) =>
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

const game = (widgets: TabletopWidget[]) =>
  ({
    id: 'g',
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
  }) as unknown as TabletopGameDefinition;

describe('handPrivacy (#449)', () => {
  const g = game([
    card('a', 'Ace'),
    card('k', 'King'),
    card('t', 'Table'),
    hand('h0', 0, ['a']),
    hand('h1', 1, ['k']),
    hand('hx', undefined, ['t']),
  ]);

  it('only cards in seat-owned hands are private', () => {
    expect([...privateCardOwners(g.widgets)]).toEqual([
      ['a', 0],
      ['k', 1],
    ]);
  });

  it('redacts private faces and returns them per seat', () => {
    const { game: out, secrets } = redactGame(g);
    expect((out.widgets.a as CardWidget).frontContent.value).toBe('BACK');
    expect(out.widgets.a.label).toBeUndefined();
    expect((out.widgets.t as CardWidget).frontContent.value).toBe('Table');
    expect(Object.keys(secrets)).toEqual(['0', '1']);
    expect(secrets[0].a.frontContent.value).toBe('Ace');
    expect(JSON.stringify(out)).not.toContain('Ace');
  });

  it('a seat restores only its own cards', () => {
    const { game: out, secrets } = redactGame(g);
    const mine = restoreCards(out.widgets, secrets[0]);
    expect((mine.a as CardWidget).frontContent.value).toBe('Ace');
    expect((mine.k as CardWidget).frontContent.value).toBe('BACK');
  });

  it('redacts deltas by the ownership after the change', () => {
    const { delta, secrets } = redactDelta(
      { widgets: { a: g.widgets.a, t: g.widgets.t, gone: null } },
      g,
    );
    expect((delta.widgets.a as CardWidget).frontContent.value).toBe('BACK');
    expect(delta.widgets.gone).toBeNull();
    expect(secrets[0].a.label).toBe('Ace');
  });

  it('seals for one seat; another key cannot open it', async () => {
    const host = await generateSealKeyPair();
    const phone = await generateSealKeyPair();
    const other = await generateSealKeyPair();
    const hostKey = await deriveSealKey(host.privateKey, await exportPublicKey(phone.publicKey));
    const phoneKey = await deriveSealKey(phone.privateKey, await exportPublicKey(host.publicKey));
    const otherKey = await deriveSealKey(other.privateKey, await exportPublicKey(host.publicKey));
    const box = await seal(hostKey, { a: 'Ace' });
    expect(await unseal(phoneKey, box)).toEqual({ a: 'Ace' });
    await expect(unseal(otherKey, box)).rejects.toThrow();
  });
});
