import { useEffect, useMemo, useRef } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { useRoomReducer } from '../../../modules/room-game/useRoomReducer';
import { useWebRTC } from '../audio/webRTCContextCore';
import { getRoleForDevice } from '../components/useStoredRoles';
import {
  handleQueueEvent,
  INITIAL_QUEUE_ROOM,
  QUEUE_ROOM_GAME_KEY,
  queueRoomAllows,
  queueRoomReducer,
  type QueueHostDeps,
  type QueueRequest,
  type QueueRoomAction,
  type QueueRoomState,
} from '../logic/queueRoom';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';
import { useQueue } from './useQueue';
import { useSongs } from './useSongsCore';

/**
 * Host side of the song queue room: mirrors `useQueue`'s queue and now-playing song into the
 * `melodiq-queue` room state (`HOST_QUEUE`) and applies phones' queue request events.
 */
export function useHostQueueRoom(): void {
  const room = useMelodiqRoomTransport();
  const { manager } = useWebRTC();
  const queueApi = useQueue();
  const { songs } = useSongs();
  const { queue, nowPlaying } = queueApi;

  const hostId = room?.selfId ?? '';
  const authorize = useMemo(() => queueRoomAllows(hostId), [hostId]);
  const { dispatch } = useRoomReducer<QueueRoomState, QueueRoomAction>({
    gameKey: QUEUE_ROOM_GAME_KEY,
    roomId: room?.roomId ?? '',
    playerId: hostId,
    isHost: true,
    reducer: queueRoomReducer,
    authorize,
    initialState: INITIAL_QUEUE_ROOM,
    transport: room?.transport,
    enabled: !!room,
    // `useQueue` (host storage) is the source of truth; the room only mirrors it.
    keepAlive: false,
  });

  useEffect(() => {
    if (room) dispatch({ type: 'HOST_QUEUE', queue, nowPlaying });
  }, [room, dispatch, queue, nowPlaying]);

  const latest = useRef({ queueApi, songs, manager });
  useEffect(() => {
    latest.current = { queueApi, songs, manager };
  });

  useRoomEvents<QueueRequest>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room,
    onEvent: (event) => {
      const { queueApi: q, songs: library, manager: m } = latest.current;
      const deps: QueueHostDeps = {
        getRole: getRoleForDevice,
        getPeer: (deviceId) =>
          m?.getConnectedPeers().find((p) => (p.deviceId ?? p.peerId) === deviceId),
        getQueue: () => q.queue,
        findSong: (songId) => library.find((s) => s.id === songId),
        addToQueue: q.addToQueue,
        removeFromQueue: q.removeFromQueue,
        toggleQueueParticipant: q.toggleQueueParticipant,
        reorderQueueParticipant: q.reorderQueueParticipant,
        selectSong: (detail) =>
          window.dispatchEvent(new CustomEvent('melodiq_remote_select_song', { detail })),
        onDenied: (req, role) =>
          console.warn(`[HostQueueRoom] Denied ${req.type} from ${req.from} (Role: ${role})`),
      };
      handleQueueEvent(event, deps);
    },
  });
}
