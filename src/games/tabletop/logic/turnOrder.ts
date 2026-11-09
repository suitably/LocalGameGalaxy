/**
 * Turn order on seats [ID: LOGIC-TABLETOP-TURN-ORDER]
 *
 * The turn is `seat.turn` (one seat at a time, read by `getPlayerStats`). Games that only define
 * private hands get their seats from `seatsForHands` first, as pass and play does.
 */
import type { HolderWidget, SeatWidget, TabletopWidget } from './types';
import { getSeatWidgets, seatsForHands } from './seatLogic';
import { isHandHolderWidget } from './handHolder';

type Widgets = Record<string, TabletopWidget>;

/** Seat index whose turn it is, or undefined. */
export function turnSeatIndex(widgets: Widgets): number | undefined {
  return getSeatWidgets(widgets).find((s) => s.turn)?.index;
}

/** Seat index of a seat widget id (e.g. the viewer's `currentSeatId`). */
export function seatIndexOf(widgets: Widgets, seatId: string | undefined): number | null {
  const seat = seatId ? widgets[seatId] : undefined;
  if (seat?.type === 'seat') return (seat as SeatWidget).index;
  const auto = /^seat_auto_(\d+)$/.exec(seatId ?? '');
  return auto ? Number(auto[1]) : null;
}

export interface TurnTarget {
  /** Seat index that gets the turn; otherwise `step` seats on from the current one. */
  seat?: number;
  step?: 1 | -1;
}

/** Widgets with the turn moved; unchanged map when there are no seats or no such seat. */
export function moveTurn(widgets: Widgets, target: TurnTarget): Widgets {
  const existing = getSeatWidgets(widgets);
  const seats = existing.length > 0 ? existing : seatsForHands(widgets);
  if (seats.length === 0) return widgets;
  const current = seats.findIndex((s) => s.turn);
  const step = target.step ?? 1;
  const next =
    target.seat !== undefined
      ? seats.findIndex((s) => s.index === target.seat)
      : current < 0
        ? step > 0
          ? 0
          : seats.length - 1
        : (current + step + seats.length) % seats.length;
  if (next < 0) return widgets;
  const out = { ...widgets };
  seats.forEach((seat, i) => {
    const turn = i === next;
    if (Boolean(seat.turn) !== turn || !widgets[seat.id]) out[seat.id] = { ...seat, turn };
  });
  return out;
}

/** Hand holders of a seat. */
export function seatHands(widgets: Widgets, seat: number): HolderWidget[] {
  return Object.values(widgets).filter(
    (w): w is HolderWidget => isHandHolderWidget(w) && w.ownerSeat === seat,
  );
}

/** Widgets of one type that belong to a seat: `ownerSeat`, or inside that seat's hand. */
export function seatWidgetsOfType(
  widgets: Widgets,
  seat: number,
  type: TabletopWidget['type'],
): string[] {
  const inHand = new Set(seatHands(widgets, seat).flatMap((h) => h.childIds ?? []));
  return Object.values(widgets)
    .filter((w) => w.type === type && (w.ownerSeat === seat || inHand.has(w.id)))
    .map((w) => w.id);
}
