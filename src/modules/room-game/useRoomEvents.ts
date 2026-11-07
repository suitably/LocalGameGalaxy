/**
 * Live events in a party room, beside its host-run state [ID: MOD-ROOM-GAME-EVENTS]
 *
 * For messages too frequent or too short-lived to be state (a played note, a clock ping): each
 * event goes to every device in the room once and is not kept. Same transport as
 * `useRoomReducer` (`getRoomTransport(roomId)`), channel `<gameKey>_<roomId>_live`. Events carry
 * no ordering guarantee; a receiver must cope with late, repeated or stale ones (MQTT may
 * redeliver the last one on join).
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { getRoomTransport, type RoomTransport } from './roomTransport';

export interface UseRoomEventsOptions<E> {
  gameKey: string;
  roomId: string;
  /** Called for every event (own ones included, filter by sender); `send` answers. */
  onEvent: (event: E, send: (event: E) => void) => void;
  enabled?: boolean;
  /** Defaults to `getRoomTransport(roomId)`. */
  transport?: RoomTransport;
}

export function useRoomEvents<E>({
  gameKey,
  roomId,
  onEvent,
  enabled = true,
  transport,
}: UseRoomEventsOptions<E>): { send: (event: E) => void } {
  const onEventRef = useRef(onEvent);
  useLayoutEffect(() => {
    onEventRef.current = onEvent;
  });
  const channel = `${gameKey}_${roomId}_live`;
  const t = useMemo(() => transport ?? getRoomTransport(roomId), [transport, roomId]);
  const send = useMemo(() => (event: E) => t.publish(channel, event), [t, channel]);

  useEffect(() => {
    if (!enabled) return;
    return t.subscribe(channel, (event) => {
      if (event) onEventRef.current(event as E, send);
    });
  }, [t, channel, enabled, send]);

  return useMemo(() => ({ send }), [send]);
}
