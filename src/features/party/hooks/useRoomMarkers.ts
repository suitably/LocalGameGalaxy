/**
 * "Tap here" markers of a party room [ID: HOOK-PARTY-ROOM-MARKERS]
 *
 * Holds the marker this device shows, the pointing mode, and sends markers to `to` (the player
 * whose turn it is, or `'all'`). Pure rules: `logic/roomMarkers.ts`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRoomEvents } from '../../../modules/room-game';
import {
  applyMarkerEvent,
  MARKER_GAME_KEY,
  MARKER_TTL_MS,
  type Marker,
  type MarkerEvent,
} from '../logic/roomMarkers';

export function useRoomMarkers(roomId: string, myId: string, to: string) {
  const [marker, setMarker] = useState<Marker | null>(null);
  const [pointing, setPointing] = useState(false);
  const apply = useCallback(
    (event: MarkerEvent) => setMarker((m) => applyMarkerEvent(m, event, myId, Date.now())),
    [myId],
  );
  const { send } = useRoomEvents<MarkerEvent>({
    gameKey: MARKER_GAME_KEY,
    roomId,
    onEvent: apply,
  });
  const emit = useCallback(
    (event: MarkerEvent) => {
      apply(event);
      send(event);
    },
    [apply, send],
  );

  // A marker runs out after `MARKER_TTL_MS`.
  useEffect(() => {
    if (!marker) return;
    const timer = setTimeout(
      () => setMarker((m) => (m === marker ? null : m)),
      Math.max(0, marker.at + MARKER_TTL_MS - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [marker]);

  const point = useCallback(
    (target: string) => {
      emit({ type: 'marker', to, target, by: myId, at: Date.now() });
      setPointing(false);
    },
    [emit, to, myId],
  );

  /** The marked element was tapped: gone here and on the device that placed it. */
  const dismiss = useCallback(() => {
    if (marker) emit({ type: 'clear', to: marker.by, by: myId, at: Date.now() });
  }, [emit, marker, myId]);

  return { marker, pointing, setPointing, point, dismiss };
}
