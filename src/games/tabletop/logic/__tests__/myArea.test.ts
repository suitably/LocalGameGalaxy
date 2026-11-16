import { describe, it, expect } from 'vitest';
import { focusView, myAreaBounds } from '../myArea';
import type { HiddenZone, HolderWidget, TabletopWidget } from '../types';

const table = { width: 2000, height: 1000 };
const zone = (id: string, ownerSeat: number, x: number, y: number): HiddenZone => ({
  id,
  x,
  y,
  width: 200,
  height: 100,
  ownerSeat,
});
const hand = (id: string, ownerSeat: number, x: number, y: number): HolderWidget => ({
  id,
  type: 'holder',
  x,
  y,
  width: 300,
  height: 200,
  zIndex: 1,
  childIds: [],
  dropTargetTypes: ['card'],
  layout: 'fan',
  isHand: true,
  ownerSeat,
});

describe('myAreaBounds', () => {
  it('spans the seat’s hidden zones and the hands it owns on the table', () => {
    const widgets: Record<string, TabletopWidget> = {
      mine: hand('mine', 1, 1500, 700),
      other: hand('other', 0, 0, 0),
      // Off-table hand (TTS hands become the phone's dock): not part of the area.
      dock: hand('dock', 1, -99999, -99999),
    };
    const hiddenZones = { a: zone('a', 1, 1000, 100), b: zone('b', 0, 0, 0) };
    expect(myAreaBounds({ table, widgets, hiddenZones }, 1)).toEqual({
      x: 1000,
      y: 100,
      width: 800,
      height: 800,
    });
  });

  it('is null for spectators and for seats that own nothing on the table', () => {
    const game = { table, widgets: {}, hiddenZones: { a: zone('a', 0, 10, 10) } };
    expect(myAreaBounds(game, null)).toBeNull();
    expect(myAreaBounds(game, 3)).toBeNull();
  });
});

describe('focusView', () => {
  it('centres the area and enlarges a small one at most twice', () => {
    const view = focusView({ width: 400, height: 800 }, { x: 1000, y: 100, width: 80, height: 40 });
    expect(view.scale).toBe(2);
    // The area's centre (1040, 120) lands in the container's centre (200, 400).
    expect(1040 * view.scale + view.x).toBe(200);
    expect(120 * view.scale + view.y).toBe(400);
  });

  it('shrinks a large area to fit with a margin', () => {
    const view = focusView({ width: 400, height: 400 }, { x: 0, y: 0, width: 1520, height: 200 });
    expect(view.scale).toBeCloseTo(400 / 1600);
  });
});
