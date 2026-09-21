import { describe, it, expect } from 'vitest';
import {
  getSeatWidgets,
  resolveSeatColor,
  getPlayerSupplyPieces,
  getPlayerStats,
} from '../seatLogic';
import type { SeatWidget, TokenWidget, HolderWidget, TabletopWidget } from '../types';

describe('seatLogic', () => {
  it('extracts and sorts seat widgets by index', () => {
    const widgets: Record<string, TabletopWidget> = {
      seat2: { id: 'seat2', type: 'seat', index: 2, color: '#2563eb' } as SeatWidget,
      seat1: { id: 'seat1', type: 'seat', index: 1, color: '#dc2626' } as SeatWidget,
      token1: { id: 'token1', type: 'token', color: '#fff', shape: 'circle' } as TokenWidget,
    };

    const seats = getSeatWidgets(widgets);
    expect(seats.length).toBe(2);
    expect(seats[0].id).toBe('seat1');
    expect(seats[1].id).toBe('seat2');
  });

  it('resolves seat colors with fallbacks for white and black seats', () => {
    const whiteSeat = { id: 'White Seat', type: 'seat', index: 1 } as SeatWidget;
    const blackSeat = { id: 'Black Seat', type: 'seat', index: 2 } as SeatWidget;
    const customSeat = { id: 'Seat 3', type: 'seat', index: 3, color: '#10b981' } as SeatWidget;
    const defaultSeat = { id: 'Player 4', type: 'seat', index: 4 } as SeatWidget;

    expect(resolveSeatColor(whiteSeat)).toBe('#f8fafc');
    expect(resolveSeatColor(blackSeat)).toBe('#1e293b');
    expect(resolveSeatColor(customSeat)).toBe('#10b981');
    expect(resolveSeatColor(defaultSeat)).toBe('#ea580c');
  });

  it('finds player supply pieces for a given seat', () => {
    const widgets: Record<string, TabletopWidget> = {
      'Player 1 - Roads': {
        id: 'Player 1 - Roads',
        type: 'holder',
        childIds: ['road_1', 'road_2'],
      } as HolderWidget,
      'Player 1 - Settlements': {
        id: 'Player 1 - Settlements',
        type: 'holder',
        childIds: ['settlement_1'],
      } as HolderWidget,
      road_1: { id: 'road_1', type: 'token', parent: 'Player 1 - Roads' } as TokenWidget,
      road_2: { id: 'road_2', type: 'token', parent: 'Player 1 - Roads' } as TokenWidget,
      settlement_1: { id: 'settlement_1', type: 'token', parent: 'Player 1 - Settlements' } as TokenWidget,
      road_p2: { id: 'road_p2', type: 'token', parent: 'Player 2 - Roads' } as TokenWidget,
    };

    const pieces = getPlayerSupplyPieces(widgets, 1);
    expect(pieces['Road'].length).toBe(2);
    expect(pieces['Settlement'].length).toBe(1);
    expect(pieces['City']).toBeUndefined();
  });

  it('computes player summary stats for the HUD', () => {
    const seat: SeatWidget = {
      id: 'Player 1 - Seat',
      type: 'seat',
      index: 1,
      color: '#dc2626',
      turn: true,
    } as SeatWidget;

    const widgets: Record<string, TabletopWidget> = {
      'Player 1 - Seat': seat,
      'Player 1 - Roads': {
        id: 'Player 1 - Roads',
        type: 'holder',
        childIds: ['r1'],
      } as HolderWidget,
      r1: { id: 'r1', type: 'token', parent: 'Player 1 - Roads' } as TokenWidget,
      'Player 1 Hand': {
        id: 'Player 1 Hand',
        type: 'holder',
        isHand: true,
        ownerSeat: 0,
        childIds: ['c1', 'c2'],
      } as HolderWidget,
      c1: { id: 'c1', type: 'card' } as TabletopWidget,
      c2: { id: 'c2', type: 'card' } as TabletopWidget,
    };

    const stats = getPlayerStats(widgets, seat);
    expect(stats.seatIndex).toBe(1);
    expect(stats.isTurn).toBe(true);
    expect(stats.color).toBe('#dc2626');
    expect(stats.handCardCount).toBe(2);
    expect(stats.supplies.find((s) => s.group === 'Road')?.inSupply).toBe(1);
  });
});
