import { useCallback } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { useRoomReducer } from '../../../modules/room-game/useRoomReducer';
import {
  INITIAL_QUEUE_ROOM,
  QUEUE_ROOM_GAME_KEY,
  queueRoomReducer,
  type QueueRequest,
  type QueueRequestPayload,
  type QueueRoomAction,
  type QueueRoomState,
} from '../logic/queueRoom';
import { MELODIQ_GAME_KEY, usePhoneRoom } from './useMelodiqRoomTransport';

const ignore = () => {};

/**
 * Phone side: sends a queue request (`queue.add`, `queue.select_song`, …) to the host as a room
 * event. Returns false (nothing sent) while not connected, and on the host.
 */
export function useQueueRequestSender(): (request: QueueRequestPayload) => boolean {
  const room = usePhoneRoom();
  const { send } = useRoomEvents<QueueRequest>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: ignore,
  });
  const selfId = room?.selfId;
  return useCallback(
    (request: QueueRequestPayload) => {
      if (!selfId) return false;
      send({ ...request, from: selfId } as QueueRequest);
      return true;
    },
    [send, selfId],
  );
}

/**
 * Phone side: the host's queue and now-playing song from the `melodiq-queue` room state, plus the
 * request sender. Inactive (initial state) on the host and while the phone is not connected.
 */
export function usePhoneQueueRoom(): {
  state: QueueRoomState;
  sendRequest: (request: QueueRequestPayload) => boolean;
} {
  const room = usePhoneRoom();
  const { state } = useRoomReducer<QueueRoomState, QueueRoomAction>({
    gameKey: QUEUE_ROOM_GAME_KEY,
    roomId: room?.roomId ?? '',
    playerId: room?.selfId ?? '',
    isHost: false,
    reducer: queueRoomReducer,
    initialState: INITIAL_QUEUE_ROOM,
    transport: room?.transport,
    enabled: !!room,
    // The peer follows the host link (a new one per connection); never kept in the registry.
    keepAlive: false,
  });
  return { state, sendRequest: useQueueRequestSender() };
}
