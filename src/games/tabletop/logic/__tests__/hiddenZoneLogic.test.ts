import { describe, it, expect } from 'vitest';
import {
  isWidgetInsideZone,
  findZonesContainingWidget,
  isWidgetHiddenForViewer,
  createDefaultHiddenZone,
  isWidgetLocked,
  filterVisibleForViewer,
  dragZoneRect,
  clampZoneRect,
  setZoneRectWithContents,
} from '../hiddenZoneLogic';
import { recordChange, undoStep, EMPTY_HISTORY } from '../editHistory';
import { applyGameDelta } from '../stateDelta';
import type { TabletopWidget, HiddenZone, TabletopGameDefinition } from '../types';

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

  describe('moving and resizing zones', () => {
    const pinned: TabletopWidget = { ...widgetInside, id: 'pinned', pinned: true };
    const fixed: TabletopWidget = { ...widgetInside, id: 'fixed', movable: false };
    const game = {
      id: 'g',
      name: 'G',
      version: '1',
      minPlayers: 1,
      maxPlayers: 4,
      table: { width: 1000, height: 800 },
      widgets: { card_1: widgetInside, card_2: widgetOutside, pinned, fixed },
      hiddenZones: { [sampleZone.id]: sampleZone },
    } as unknown as TabletopGameDefinition;

    it('treats pinned and non-movable widgets as locked', () => {
      expect(isWidgetLocked(pinned)).toBe(true);
      expect(isWidgetLocked(fixed)).toBe(true);
      expect(isWidgetLocked(widgetInside)).toBe(false);
    });

    it('filters widgets hidden from the viewer', () => {
      const zones = { [sampleZone.id]: sampleZone };
      const list = [widgetInside, widgetOutside];
      expect(filterVisibleForViewer(list, zones, 1)).toEqual([widgetOutside]);
      expect(filterVisibleForViewer(list, zones, 0)).toEqual(list);
      expect(filterVisibleForViewer(list, undefined, 1)).toBe(list);
    });

    it('computes drag rectangles for move and resize', () => {
      expect(dragZoneRect(sampleZone, 10.4, -20, 'move')).toEqual({
        x: 110,
        y: 80,
        width: 300,
        height: 200,
      });
      expect(dragZoneRect(sampleZone, 50, -500, 'resize')).toEqual({
        x: 100,
        y: 100,
        width: 350,
        height: 20,
      });
    });

    it('clamps a zone to the table', () => {
      expect(clampZoneRect({ x: -50, y: 700, width: 300, height: 200 }, 1000, 800)).toEqual({
        x: 0,
        y: 600,
        width: 300,
        height: 200,
      });
    });

    it('moves unlocked widgets inside the zone along', () => {
      const next = setZoneRectWithContents(game, sampleZone.id, {
        x: 200,
        y: 150,
        width: 300,
        height: 200,
      });
      expect(next.hiddenZones?.zone_1).toMatchObject({ x: 200, y: 150 });
      expect(next.widgets.card_1).toMatchObject({ x: 250, y: 200 });
      expect(next.widgets.card_2).toBe(widgetOutside);
      expect(next.widgets.pinned).toBe(pinned);
      expect(next.widgets.fixed).toBe(fixed);
    });

    it('resizes without moving contents', () => {
      const next = setZoneRectWithContents(game, sampleZone.id, {
        x: 100,
        y: 100,
        width: 400,
        height: 250,
      });
      expect(next.hiddenZones?.zone_1).toMatchObject({ width: 400, height: 250 });
      expect(next.widgets).toBe(game.widgets);
    });

    it('returns the same game for unknown zones or no change', () => {
      expect(setZoneRectWithContents(game, 'nope', sampleZone)).toBe(game);
      expect(setZoneRectWithContents(game, sampleZone.id, sampleZone)).toBe(game);
    });

    it('undoes zone and contents in one step', () => {
      const moved = setZoneRectWithContents(game, sampleZone.id, {
        x: 300,
        y: 300,
        width: 300,
        height: 200,
      });
      const step = undoStep(recordChange(EMPTY_HISTORY, game, moved));
      expect(step).not.toBeNull();
      const restored = applyGameDelta(moved, step!.delta);
      expect(restored.hiddenZones?.zone_1).toEqual(sampleZone);
      expect(restored.widgets.card_1).toEqual(widgetInside);
    });
  });
});
