import { describe, expect, it } from 'vitest';
import { findPlayerHandHolder } from '../boardFilter';
import { seatsForHands } from '../seatLogic';
import type { HolderWidget, SeatWidget, TabletopWidget } from '../types';

const hand = (id: string, ownerSeat: number): HolderWidget => ({
  id,
  type: 'holder',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  zIndex: 0,
  childIds: [],
  dropTargetTypes: ['card'],
  layout: 'stack',
  isHand: true,
  ownerSeat,
  label: `Spieler ${ownerSeat + 1}`,
});

const widgets = (): Record<string, TabletopWidget> => ({
  hand_p0: hand('hand_p0', 0),
  hand_p1: hand('hand_p1', 1),
  hand_p2: hand('hand_p2', 2),
});

describe('pass and play seats for hand-only games', () => {
  it('creates one seat per hand owner, in order', () => {
    const seats = seatsForHands(widgets());
    expect(seats.map((s) => [s.index, s.hand, s.label])).toEqual([
      [0, 'hand_p0', 'Spieler 1'],
      [1, 'hand_p1', 'Spieler 2'],
      [2, 'hand_p2', 'Spieler 3'],
    ]);
  });

  it('adds nothing when the game already has seats', () => {
    const seat: SeatWidget = {
      id: 's',
      type: 'seat',
      index: 1,
      color: '#f00',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      zIndex: 0,
    };
    expect(seatsForHands({ ...widgets(), s: seat })).toEqual([]);
  });

  it('gives each seat index its own hand (exact owner first)', () => {
    const w = widgets();
    expect(findPlayerHandHolder(w, 0)?.id).toBe('hand_p0');
    expect(findPlayerHandHolder(w, 1)?.id).toBe('hand_p1');
    expect(findPlayerHandHolder(w, 2)?.id).toBe('hand_p2');
  });
});
