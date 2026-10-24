import { describe, it, expect } from 'vitest';
import {
  isWidgetInsideZone,
  findZonesContainingWidget,
  isWidgetHiddenForViewer,
  createDefaultHiddenZone,
  moveZoneWithContents,
  resizeZone,
  isWidgetLocked,
  getHiddenWidgetIds,
  MIN_ZONE_SIZE,
} from '../hiddenZoneLogic';
import type { TabletopWidget, HiddenZone } from '../types';

describe('hiddenZoneLogic', () => {
  const sampleZone: HiddenZone = {
    id: 'zone_1',
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    color: '#4caf50',
    ownerSeat: 0, // Player 1
    revealed: false,
  };

  const widgetInside: TabletopWidget = {
    id: 'card_1',
    type: 'card',
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    zIndex: 1,
    faceUp: true,
    frontContent: { type: 'text', value: 'A' },
    backContent: { type: 'text', value: 'B' },
    rotation: 0,
  };

  const widgetOutside: TabletopWidget = {
    id: 'card_2',
    type: 'card',
    x: 500,
    y: 500,
    width: 100,
    height: 100,
    zIndex: 1,
    faceUp: true,
    frontContent: { type: 'text', value: 'C' },
    backContent: { type: 'text', value: 'D' },
    rotation: 0,
  };

  it('detects widget inside zone correctly', () => {
    expect(isWidgetInsideZone(widgetInside, sampleZone)).toBe(true);
    expect(isWidgetInsideZone(widgetOutside, sampleZone)).toBe(false);
  });

  it('finds zones containing widget', () => {
    const zones = { [sampleZone.id]: sampleZone };
    expect(findZonesContainingWidget(widgetInside, zones)).toEqual([sampleZone]);
    expect(findZonesContainingWidget(widgetOutside, zones)).toEqual([]);
  });

  it('hides widget for non-owner viewers', () => {
    const zones = { [sampleZone.id]: sampleZone };
    // Viewer seat 1 is NOT owner (owner is seat 0) -> hidden
    expect(isWidgetHiddenForViewer(widgetInside, zones, 1)).toBe(true);
    // Viewer seat 0 IS owner -> not hidden
    expect(isWidgetHiddenForViewer(widgetInside, zones, 0)).toBe(false);
  });

  it('respects showAlways override', () => {
    const zones = { [sampleZone.id]: sampleZone };
    const showAlwaysWidget: TabletopWidget = {
      ...widgetInside,
      showAlways: true,
    };
    // Even for non-owner, showAlways prevents obscuring
    expect(isWidgetHiddenForViewer(showAlwaysWidget, zones, 1)).toBe(false);
  });

  it('does not hide when zone is revealed', () => {
    const revealedZone: HiddenZone = { ...sampleZone, revealed: true };
    const zones = { [revealedZone.id]: revealedZone };
    expect(isWidgetHiddenForViewer(widgetInside, zones, 1)).toBe(false);
  });

  it('creates default hidden zone with correct coordinates and owner', () => {
    const zone = createDefaultHiddenZone('zone_test', 1600, 1000, {
      ownerSeat: 2,
      color: '#ff9800',
    });
    expect(zone.id).toBe('zone_test');
    expect(zone.ownerSeat).toBe(2);
    expect(zone.color).toBe('#ff9800');
    expect(zone.revealed).toBe(false);
    expect(zone.width).toBeGreaterThan(0);
    expect(zone.height).toBeGreaterThan(0);
  });

  describe('getHiddenWidgetIds', () => {
    const outside = { ...widgetInside, id: 'card_out', x: 900, y: 900 } as TabletopWidget;
    const shown = { ...widgetInside, id: 'card_show', showAlways: true } as TabletopWidget;
    const widgets = { card_1: widgetInside, card_out: outside, card_show: shown };
    const zones = { zone_1: sampleZone };

    it('obscures contained widgets for other seats only', () => {
      expect([...getHiddenWidgetIds({ widgets, hiddenZones: zones }, 1)]).toEqual(['card_1']);
      expect([...getHiddenWidgetIds({ widgets, hiddenZones: zones })]).toEqual(['card_1']);
    });

    it('shows everything to the zone owner', () => {
      expect(getHiddenWidgetIds({ widgets, hiddenZones: zones }, 0).size).toBe(0);
    });

    it('shows everything when the zone is revealed', () => {
      const revealed = { zone_1: { ...sampleZone, revealed: true } };
      expect(getHiddenWidgetIds({ widgets, hiddenZones: revealed }, 1).size).toBe(0);
    });

    it('returns an empty set without zones', () => {
      expect(getHiddenWidgetIds({ widgets }, 1).size).toBe(0);
    });
  });
});

describe('zone move and resize', () => {
  const mk = (id: string, x: number, y: number, extra: Partial<TabletopWidget> = {}) =>
    ({ id, type: 'token', x, y, width: 20, height: 20, zIndex: 1, ...extra }) as TabletopWidget;
  const zone: HiddenZone = {
    id: 'z',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    color: '#000',
    revealed: false,
  };
  const game = {
    table: { width: 1000, height: 800 },
    hiddenZones: { z: zone },
    widgets: {
      a: mk('a', 150, 150),
      pin: mk('pin', 160, 160, { pinned: true }),
      fix: mk('fix', 170, 170, { movable: false }),
      out: mk('out', 600, 600),
    },
  } as unknown as Parameters<typeof moveZoneWithContents>[0];

  it('detects locked widgets', () => {
    expect(isWidgetLocked(mk('p', 0, 0, { pinned: true }))).toBe(true);
    expect(isWidgetLocked(mk('m', 0, 0, { movable: false }))).toBe(true);
    expect(isWidgetLocked(mk('f', 0, 0))).toBe(false);
  });

  it('moves zone with unlocked contained widgets only', () => {
    const r = moveZoneWithContents(game, 'z', 50, -20);
    expect(r?.zone).toEqual({ x: 150, y: 80 });
    expect(r?.widgets).toEqual({ a: { x: 200, y: 130 } });
  });

  it('clamps zone to table and moves widgets by the effective delta', () => {
    const r = moveZoneWithContents(game, 'z', -500, 0);
    expect(r?.zone.x).toBe(0);
    expect(r?.widgets.a.x).toBe(50);
  });

  it('returns null for unknown zone or no movement', () => {
    expect(moveZoneWithContents(game, 'nope', 1, 1)).toBeNull();
    expect(moveZoneWithContents(game, 'z', 0, 0)).toBeNull();
  });

  it('resizeZone clamps to min size and table bounds', () => {
    const table = { width: 1000, height: 800 };
    expect(resizeZone(table, { x: 10, y: 10, width: 5, height: 5 })).toEqual({
      x: 10,
      y: 10,
      width: MIN_ZONE_SIZE,
      height: MIN_ZONE_SIZE,
    });
    expect(resizeZone(table, { x: 900, y: 700, width: 400, height: 400 })).toEqual({
      x: 600,
      y: 400,
      width: 400,
      height: 400,
    });
    expect(resizeZone(table, { x: 0, y: 0, width: 5000, height: 5000 })).toMatchObject({
      width: 1000,
      height: 800,
    });
  });
});
