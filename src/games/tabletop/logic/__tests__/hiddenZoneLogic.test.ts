import { describe, it, expect } from 'vitest';
import {
  isWidgetInsideZone,
  findZonesContainingWidget,
  isWidgetHiddenForViewer,
  createDefaultHiddenZone,
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
});
