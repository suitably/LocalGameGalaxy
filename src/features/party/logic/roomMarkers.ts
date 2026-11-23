/**
 * "Tap here" markers in a party room [ID: LOGIC-PARTY-ROOM-MARKERS]
 *
 * A player points at an element of a game on their own screen; the same element pulses on the
 * other device. Targets are semantic (`data-room-target="<game>.<id>"`), not coordinates, because
 * the screens differ. Markers travel as live events (`useRoomEvents`, channel
 * `party-marker_<room>_live`) and are never kept: stale or repeated events are dropped by age.
 */

export const MARKER_GAME_KEY = 'party-marker';
/** Attribute that names an element a marker can point at. */
export const MARKER_ATTRIBUTE = 'data-room-target';
/** A marker disappears after this long (or when its element is tapped). */
export const MARKER_TTL_MS = 15_000;
/** Older events (MQTT redelivers the last one on join) are ignored. */
export const MARKER_MAX_AGE_MS = 30_000;

export type MarkerEvent =
  | { type: 'marker'; to: string; target: string; by: string; at: number }
  | { type: 'clear'; to: string; by: string; at: number };

export interface Marker {
  target: string;
  by: string;
  at: number;
}

const isFor = (to: string, by: string, myId: string) => to === myId || to === 'all' || by === myId;

/** The marker this device shows after `event` (`current` when the event does not concern it). */
export function applyMarkerEvent(
  current: Marker | null,
  event: MarkerEvent | null | undefined,
  myId: string,
  now: number,
): Marker | null {
  if (!event || typeof event.at !== 'number' || now - event.at > MARKER_MAX_AGE_MS) return current;
  if (!isFor(event.to, event.by, myId)) return current;
  if (current && event.at < current.at) return current;
  if (event.type === 'clear') return null;
  if (event.type !== 'marker' || typeof event.target !== 'string' || !event.target) return current;
  return { target: event.target, by: event.by, at: event.at };
}

/** Whether a shown marker has run out. */
export const markerExpired = (marker: Marker, now: number): boolean =>
  now - marker.at >= MARKER_TTL_MS;

/** The CSS selector of a marker target (quotes in ids are escaped). */
export const markerSelector = (target: string): string =>
  `[${MARKER_ATTRIBUTE}="${target.replace(/["\\]/g, '\\$&')}"]`;
