import { describe, it, expect } from 'vitest';
import {
  redactHiddenWidget,
  redactZoneWidgets,
  withZoneVisibilityChanges,
  zoneAudience,
} from '../hiddenZoneRedaction';
import { redactGame } from '../handPrivacy';
import { PrivateHandChannel } from '../privateHandChannel';
import type {
  CardWidget,
  HiddenZone,
  LabelWidget,
  TabletopGameDefinition,
  TabletopWidget,
} from '../types';

const card = (id: string, front: string, x: number): CardWidget => ({
  id,
  type: 'card',
  x,
  y: 0,
  width: 80,
  height: 120,
  zIndex: 1,
  label: front,
  image: `${front}.png`,
  frontContent: { type: 'image', value: `${front}-face.png` },
  backContent: { type: 'text', value: 'BACK' },
  faceUp: true,
  rotation: 0,
});
const note = (id: string, text: string, x: number): LabelWidget => ({
  id,
  type: 'label',
  x,
  y: 0,
  width: 80,
  height: 40,
  zIndex: 2,
  text,
  color: '#ff0000',
});
const zone = (id: string, x: number, ownerSeat?: number, revealed = false): HiddenZone => ({
  id,
  x,
  y: 0,
  width: 200,
  height: 200,
  ownerSeat,
  revealed,
});
const hand = (id: string, seat: number, childIds: string[], x: number) =>
  ({
    id,
    type: 'holder',
    x,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 1,
    isHand: true,
    ownerSeat: seat,
    layout: 'fan',
    dropTargetTypes: ['card'],
    childIds,
  }) as TabletopWidget;

const makeGame = (widgets: TabletopWidget[], zones: HiddenZone[]): TabletopGameDefinition =>
  ({
    id: 'g',
    widgets: Object.fromEntries(widgets.map((w) => [w.id, w])),
    hiddenZones: Object.fromEntries(zones.map((z) => [z.id, z])),
  }) as unknown as TabletopGameDefinition;

// Seat 1's zone at x 0–200, seat 0's at 1000–1200, a table (GM) zone at 2000–2200, open table.
const zones = [zone('z1', 0, 1), zone('z0', 1000, 0), zone('gm', 2000)];
const g = makeGame(
  [
    card('secret1', 'Dragon', 50),
    note('plan1', 'attack at dawn', 60),
    card('secret0', 'Wizard', 1050),
    card('gmCard', 'Trap', 2050),
    card('open', 'Village', 3050),
  ],
  zones,
);
const noHand = (game: TabletopGameDefinition) => ({ widgets: game.widgets, secrets: {} });

describe('hiddenZoneRedaction (#551)', () => {
  it('names the seats that may see through, or null when nothing hides the widget', () => {
    expect(zoneAudience(g.widgets.secret1, g.hiddenZones)).toEqual([1]);
    expect(zoneAudience(g.widgets.gmCard, g.hiddenZones)).toEqual([]);
    expect(zoneAudience(g.widgets.open, g.hiddenZones)).toBeNull();
    const shown = { ...g.widgets.secret1, showAlways: true };
    expect(zoneAudience(shown, g.hiddenZones)).toBeNull();
  });

  it('keeps geometry and structure only', () => {
    const out = redactHiddenWidget(g.widgets.secret1) as CardWidget;
    expect(out).toMatchObject({ id: 'secret1', type: 'card', x: 50, width: 80, faceUp: true });
    expect(out.frontContent.value).toBe('');
    expect(out.backContent.value).toBe('');
    expect(JSON.stringify(out)).not.toMatch(/Dragon|BACK/);
    expect((redactHiddenWidget(g.widgets.plan1) as LabelWidget).text).toBe('');
  });

  it('a client of seat 0 receives no data of seat 1 zone; seat 1 gets it back', () => {
    const { widgets, secrets } = redactZoneWidgets(g.widgets, noHand(g), g.hiddenZones);
    const wire = JSON.stringify(widgets);
    for (const leak of ['Dragon', 'attack at dawn', 'Wizard', 'Trap', '#ff0000']) {
      expect(wire).not.toContain(leak);
    }
    expect(wire).toContain('Village');
    expect(JSON.stringify(secrets[0])).not.toMatch(/Dragon|attack at dawn|Trap/);
    expect(secrets[0].secret0).toEqual(g.widgets.secret0);
    expect(secrets[1].secret1).toEqual(g.widgets.secret1);
    expect(secrets[1].plan1).toEqual(g.widgets.plan1);
    expect(Object.keys(secrets).sort()).toEqual(['0', '1']);
  });

  it('a revealed zone sends the real data to everyone', () => {
    const revealed = makeGame(Object.values(g.widgets), [zone('z1', 0, 1, true)]);
    const { widgets, secrets } = redactZoneWidgets(
      revealed.widgets,
      noHand(revealed),
      revealed.hiddenZones,
    );
    expect(widgets.secret1).toBe(revealed.widgets.secret1);
    expect(secrets).toEqual({});
  });

  it('a hand inside a zone: the zone owner sees the hand as the hand rules allow', () => {
    const game = makeGame(
      [card('a', 'Ace', 1050), hand('h1', 1, ['a'], 1050)],
      [zone('z0', 1000, 0)],
    );
    const handView = redactGame(game);
    const { widgets, secrets } = redactZoneWidgets(
      game.widgets,
      { widgets: handView.game.widgets, secrets: handView.secrets },
      game.hiddenZones,
    );
    expect(JSON.stringify(widgets)).not.toContain('Ace');
    // Seat 1 owns the hand but cannot see through seat 0's zone.
    expect(secrets[1]).toBeUndefined();
    // Seat 0 sees through its zone but the card stays face down for it.
    expect((secrets[0].a as CardWidget).frontContent.value).toBe('BACK');
  });

  it('a zone change resends the widgets whose visibility changed', () => {
    const revealed = { ...g, hiddenZones: { ...g.hiddenZones, z1: zone('z1', 0, 1, true) } };
    const delta = withZoneVisibilityChanges(
      { widgets: {}, fields: { hiddenZones: revealed.hiddenZones } },
      g,
      revealed,
    );
    expect(Object.keys(delta.widgets).sort()).toEqual(['plan1', 'secret1']);
    const same = { widgets: {} };
    expect(withZoneVisibilityChanges(same, g, g)).toBe(same);
  });
});

describe('PrivateHandChannel with hidden zones (#551)', () => {
  const front = (w: unknown) => (w as CardWidget).frontContent.value;

  it('seals each zone for its owner; spectators and other seats see none of it', async () => {
    const host = new PrivateHandChannel();
    const seat0 = new PrivateHandChannel();
    const seat1 = new PrivateHandChannel();
    await host.registerSeat(0, (await seat0.publicKey())!);
    await host.registerSeat(1, (await seat1.publicKey())!);

    const snap = await host.outgoingSnapshot(g);
    expect(JSON.stringify(snap.state)).not.toMatch(/Dragon|Wizard|Trap|attack at dawn/);
    expect(g.widgets.secret1.label).toBe('Dragon'); // the host keeps the full state
    await seat0.acceptHostKey(snap.hostKey);
    await seat1.acceptHostKey(snap.hostKey);
    const view0 = await seat0.open(snap.state.widgets, snap.sealed, 0);
    const view1 = await seat1.open(snap.state.widgets, snap.sealed, 1);
    expect(view0.secret0).toEqual(g.widgets.secret0);
    expect(front(view0.secret1)).toBe('');
    expect(view1.secret1).toEqual(g.widgets.secret1);
    expect((view1.plan1 as LabelWidget).text).toBe('attack at dawn');
    expect(front(view1.secret0)).toBe('');
    expect(front(view1.gmCard)).toBe('');
    const spectator = new PrivateHandChannel();
    await spectator.acceptHostKey(snap.hostKey);
    expect(await spectator.open(snap.state.widgets, snap.sealed, null)).toBe(snap.state.widgets);
  });

  it('redacts without registered seats and delivers the data again once revealed', async () => {
    const host = new PrivateHandChannel();
    const snap = await host.outgoingSnapshot(g);
    expect(JSON.stringify(snap.state)).not.toContain('Dragon');
    expect(snap.sealed).toBeUndefined();

    const revealed = { ...g, hiddenZones: { ...g.hiddenZones, z1: zone('z1', 0, 1, true) } };
    const out = await host.outgoingDelta(
      { widgets: {}, fields: { hiddenZones: revealed.hiddenZones } },
      revealed,
      g,
    );
    expect(out.delta.widgets.secret1).toEqual(g.widgets.secret1);
    expect(out.delta.widgets.plan1).toEqual(g.widgets.plan1);

    const moved = { ...g.widgets.open, x: 1050 };
    const into = await host.outgoingDelta(
      { widgets: { open: moved } },
      { ...g, widgets: { ...g.widgets, open: moved } },
      g,
    );
    expect(JSON.stringify(into.delta)).not.toContain('Village');
  });
});
