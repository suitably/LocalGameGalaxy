/**
 * URL roles of the running table [ID: LOGIC-TABLETOP-ROUTE]
 *
 * `role=tv` hosts (table only, or with `seat=N` the host plays that seat on its own device),
 * `role=screen` is a read-only table for a TV, `role=spectator` a seatless phone, `seat=N` a
 * phone controller.
 */
export interface TabletopRoute {
  roomId: string | null;
  gameId: string;
  isLocal: boolean;
  isHost: boolean;
  /** Read-only table on a TV that only shows public data. */
  isScreen: boolean;
  /** Spectators and screens: no seat, never an intent. */
  isSpectator: boolean;
  /** Seat of this device; a host has one only when it plays along. */
  seat: number | null;
}

const parseSeat = (raw: string | null): number | null => {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

export function parseTabletopRoute(params: URLSearchParams): TabletopRoute {
  const role = params.get('role');
  const isScreen = role === 'screen';
  const isSpectator = role === 'spectator' || isScreen;
  return {
    roomId: params.get('room'),
    gameId: params.get('gameId') || 'standard-cards',
    isLocal: params.get('local') === '1',
    isHost: role === 'tv',
    isScreen,
    isSpectator,
    seat: isSpectator ? null : parseSeat(params.get('seat')),
  };
}

/** Route a TV opens to show the shared table of a room. */
export function buildScreenRoute(roomId: string, gameId: string): string {
  const q = new URLSearchParams({ room: roomId, gameId, role: 'screen' });
  return `/games/tabletop?${q.toString()}`;
}

/** The same query with the host's seat set (`null` removes it). */
export function withHostSeat(params: URLSearchParams, seat: number | null): string {
  const next = new URLSearchParams(params);
  if (seat === null) next.delete('seat');
  else next.set('seat', String(seat));
  return next.toString();
}

/** The host's seat in the party roster (its slot), 0 without a party or slot. */
export function hostSeatFromRoster(
  players: ReadonlyArray<{ id: string; slot?: number; spectator?: boolean }> | null | undefined,
  myId: string,
): number {
  const me = players?.find((p) => p.id === myId);
  return me && !me.spectator && typeof me.slot === 'number' && me.slot >= 0 ? me.slot : 0;
}
