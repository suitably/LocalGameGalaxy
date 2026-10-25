import { describe, expect, it } from 'vitest';
import { resolveSeatView, seatsForHands, SPECTATOR_SEAT_ID } from '../seatLogic';
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
  layout: 'fan',
  isHand: true,
  ownerSeat,
});

const seat = (id: string, index: number, handId?: string): SeatWidget => ({
  id,
  type: 'seat',
  index,
  color: '#fff',
  hand: handId,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  zIndex: 0,
});

/** Hands listed in reverse, so object order would pick the wrong one. */
const handOnlyGame = (): Record<string, TabletopWidget> => {
  const hands: Record<string, TabletopWidget> = {
    hand_p1: hand('hand_p1', 1),
    hand_p0: hand('hand_p0', 0),
  };
  for (const s of seatsForHands(hands)) hands[s.id] = s;
  return hands;
};

describe('resolveSeatView', () => {
  it('gives player 1 (seat index 0) its own hand before any seat was picked', () => {
    const view = resolveSeatView(handOnlyGame(), undefined);
    expect(view.activeSeat?.index).toBe(0);
    expect(view.handHolder?.id).toBe('hand_p0');
    expect(view.isSpectator).toBe(false);
  });

  it('follows the chosen seat', () => {
    expect(resolveSeatView(handOnlyGame(), 'seat_auto_1').handHolder?.id).toBe('hand_p1');
  });

  it('prefers the seat hand link over owner heuristics', () => {
    const widgets: Record<string, TabletopWidget> = {
      a: hand('a', 1),
      b: hand('b', 0),
      s1: seat('s1', 1, 'b'),
    };
    expect(resolveSeatView(widgets, 's1').handHolder?.id).toBe('b');
  });

  it('gives spectators no seat and no hand', () => {
    const view = resolveSeatView(handOnlyGame(), SPECTATOR_SEAT_ID);
    expect(view).toEqual({ isSpectator: true });
  });
});
