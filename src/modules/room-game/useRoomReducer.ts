/**
 * `useReducer` shared by everyone in a party room [ID: MOD-ROOM-GAME-HOOK]
 *
 * The host reduces locally and publishes each new state; guests send their actions to the host
 * and render what it publishes. A guest says hello when it opens, and the host answers with the
 * current state, so a reload or late join catches up. Transport: BroadcastChannel + MQTT
 * (`lgg/room`, channel `<gameKey>_<roomId>`).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MqttMailboxService } from '../sync/MqttMailboxService';
import { MultiChannelSyncCoordinator } from '../sync/useMultiChannelSync';
import { roomMailbox } from './roomTransport';
import { guestAccept, hostApply, type RoomHost, type RoomMessage } from './roomSync';

export interface UseRoomReducerOptions<S, A> {
  gameKey: string;
  roomId: string;
  /** This device's player id in the room. */
  playerId: string;
  isHost: boolean;
  reducer: (state: S, action: A) => S;
  /** Host-side check that `from` may perform `action` (e.g. only on their own sheet). */
  authorize?: (state: S, action: A, from: string) => boolean;
  initialState: S;
}

export function useRoomReducer<S, A>({
  gameKey,
  roomId,
  playerId,
  isHost,
  reducer,
  authorize,
  initialState,
}: UseRoomReducerOptions<S, A>): { state: S; dispatch: (action: A) => void; synced: boolean } {
  const [host, setHost] = useState<RoomHost<S>>({ state: initialState, rev: 0 });
  const [synced, setSynced] = useState(isHost);
  // Every state change goes through hostRef first, so it never lags behind `host`.
  const hostRef = useRef(host);
  const optsRef = useRef({ reducer, authorize, isHost, playerId });
  useLayoutEffect(() => {
    optsRef.current = { reducer, authorize, isHost, playerId };
  });

  const sync = useMemo(
    () =>
      new MultiChannelSyncCoordinator<RoomMessage<S, A>>({
        channelId: `${gameKey}_${roomId}`,
        broadcastPrefix: 'room',
        mailbox: roomMailbox as unknown as MqttMailboxService<RoomMessage<S, A>>,
        onMessage: () => {},
      }),
    [gameKey, roomId],
  );

  const publishState = useCallback(
    (next: RoomHost<S>) =>
      sync.publish({
        kind: 'state',
        from: optsRef.current.playerId,
        rev: next.rev,
        state: next.state,
      }),
    [sync],
  );

  const applyAsHost = useCallback(
    (action: A, from: string) => {
      const { reducer: r, authorize: auth } = optsRef.current;
      const next = hostApply(hostRef.current, action, from, r, auth);
      if (!next) return;
      hostRef.current = next;
      setHost(next);
      publishState(next);
    },
    [publishState],
  );

  useEffect(() => {
    sync.updateOptions({
      channelId: `${gameKey}_${roomId}`,
      broadcastPrefix: 'room',
      mailbox: roomMailbox as unknown as MqttMailboxService<RoomMessage<S, A>>,
      onMessage: (msg) => {
        const me = optsRef.current;
        if (!msg || msg.from === me.playerId) return;
        if (me.isHost) {
          if (msg.kind === 'hello') publishState(hostRef.current);
          else if (msg.kind === 'action') applyAsHost(msg.action, msg.from);
        } else if (msg.kind === 'state' && guestAccept(hostRef.current.rev, msg.rev)) {
          hostRef.current = { state: msg.state, rev: msg.rev };
          setHost(hostRef.current);
          setSynced(true);
        }
      },
    });
    sync.start();
    if (isHost) publishState(hostRef.current);
    else sync.publish({ kind: 'hello', from: playerId });
    return () => sync.stop();
  }, [sync, gameKey, roomId, isHost, playerId, applyAsHost, publishState]);

  // A guest keeps asking until the host's first state arrives (the broker may still connect).
  useEffect(() => {
    if (isHost || synced) return;
    const timer = setInterval(() => sync.publish({ kind: 'hello', from: playerId }), 2000);
    return () => clearInterval(timer);
  }, [isHost, synced, sync, playerId]);

  const dispatch = useCallback(
    (action: A) => {
      if (optsRef.current.isHost) applyAsHost(action, optsRef.current.playerId);
      else sync.publish({ kind: 'action', from: optsRef.current.playerId, action });
    },
    [applyAsHost, sync],
  );

  return { state: host.state, dispatch, synced };
}
