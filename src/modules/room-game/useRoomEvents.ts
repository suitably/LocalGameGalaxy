/**
 * Live events in a party room, beside its host-run state [ID: MOD-ROOM-GAME-EVENTS]
 *
 * For messages too frequent or too short-lived to be state (a played note, a clock ping): each
 * event goes to every device in the room once and is not kept. Same transport as
 * `useRoomReducer`, channel `<gameKey>_<roomId>_live`. Events carry no ordering guarantee; a
 * receiver must cope with late, repeated or stale ones (MQTT may redeliver the last one on join).
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { MqttMailboxService } from '../sync/MqttMailboxService';
import { MultiChannelSyncCoordinator } from '../sync/useMultiChannelSync';
import { roomMailbox } from './roomTransport';

export interface UseRoomEventsOptions<E> {
  gameKey: string;
  roomId: string;
  /** Called for every event (own ones included, filter by sender); `send` answers. */
  onEvent: (event: E, send: (event: E) => void) => void;
  enabled?: boolean;
}

export function useRoomEvents<E>({
  gameKey,
  roomId,
  onEvent,
  enabled = true,
}: UseRoomEventsOptions<E>): { send: (event: E) => void } {
  const onEventRef = useRef(onEvent);
  useLayoutEffect(() => {
    onEventRef.current = onEvent;
  });
  const options = useMemo(
    () => ({
      channelId: `${gameKey}_${roomId}_live`,
      broadcastPrefix: 'room',
      mailbox: roomMailbox as unknown as MqttMailboxService<E>,
    }),
    [gameKey, roomId],
  );
  const sync = useMemo(
    () => new MultiChannelSyncCoordinator<E>({ ...options, onMessage: () => {} }),
    [options],
  );

  useEffect(() => {
    if (!enabled) return;
    const send = (event: E) => sync.publish(event);
    sync.updateOptions({
      ...options,
      onMessage: (event) => {
        if (event) onEventRef.current(event, send);
      },
    });
    sync.start();
    return () => sync.stop();
  }, [sync, options, enabled]);

  return useMemo(() => ({ send: (event: E) => sync.publish(event) }), [sync]);
}
