import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { useRoomReducer } from '../../../modules/room-game/useRoomReducer';
import { useWebRTC } from '../audio/webRTCContextCore';
import { getRoleForDevice } from '../components/useStoredRoles';
import {
  CURRENT_PARTICIPANTS_ROOM_GAME_KEY,
  currentParticipantsAllows,
  currentParticipantsReducer,
  handleCurrentParticipantsEvent,
  INITIAL_CURRENT_PARTICIPANTS,
  type CurrentParticipantsAction,
  type CurrentParticipantsRequest,
  type CurrentParticipantsRequestPayload,
  type CurrentParticipantsState,
} from '../logic/currentParticipantsRoom';
import type { QueueParticipantProfile } from '../logic/queueRoom';
import type { MelodiqParticipant } from '../types';
import type { ParticipantProfile } from '../components/queueParticipantTypes';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';

interface HostSide {
  participants: MelodiqParticipant[];
  selectable: ParticipantProfile[];
  toggle: (deviceId: string, profile: QueueParticipantProfile) => void;
  reorder: (startIndex: number, endIndex: number) => void;
}

/**
 * Singers of the playing song shared with phones. Host: mirrors `host.participants` and
 * `host.selectable` into the
 * `melodiq-current-participants` room and applies permitted phone requests through
 * `host.toggle` / `host.reorder`. Phone: returns the host's list and a request sender.
 */
export function useCurrentParticipantsRoom(
  isClient: boolean,
  host: HostSide,
): {
  participants: MelodiqParticipant[];
  selectable: ParticipantProfile[];
  sendRequest: (request: CurrentParticipantsRequestPayload) => boolean;
} {
  const room = useMelodiqRoomTransport();
  const { manager } = useWebRTC();
  const selfId = room?.selfId ?? '';
  const isHost = !isClient;
  const authorize = useMemo(
    () => (isHost ? currentParticipantsAllows(selfId) : undefined),
    [isHost, selfId],
  );
  const { state, dispatch } = useRoomReducer<CurrentParticipantsState, CurrentParticipantsAction>({
    gameKey: CURRENT_PARTICIPANTS_ROOM_GAME_KEY,
    roomId: room?.roomId ?? '',
    playerId: selfId,
    isHost,
    reducer: currentParticipantsReducer,
    authorize,
    initialState: INITIAL_CURRENT_PARTICIPANTS,
    transport: room?.transport,
    enabled: !!room,
    // The host's own state is the source of truth; the room only mirrors it.
    keepAlive: false,
  });

  useEffect(() => {
    if (room && isHost) {
      dispatch({
        type: 'HOST_CURRENT_PARTICIPANTS',
        participants: host.participants,
        selectable: host.selectable,
      });
    }
  }, [room, isHost, dispatch, host.participants, host.selectable]);

  const latest = useRef({ host, manager });
  useEffect(() => {
    latest.current = { host, manager };
  });

  const { send } = useRoomEvents<CurrentParticipantsRequest>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!room && isHost,
    onEvent: (event) => {
      const { host: h, manager: m } = latest.current;
      handleCurrentParticipantsEvent(event, {
        getRole: getRoleForDevice,
        getPeer: (deviceId) =>
          m?.getConnectedPeers().find((p) => (p.deviceId ?? p.peerId) === deviceId),
        toggle: h.toggle,
        reorder: h.reorder,
        onDenied: (req, role) =>
          console.warn(`[CurrentParticipantsRoom] Denied ${req.type} from ${req.from} (${role})`),
      });
    },
  });

  const sendRequest = useCallback(
    (request: CurrentParticipantsRequestPayload) => {
      if (!isClient || !selfId) return false;
      send({ ...request, from: selfId } as CurrentParticipantsRequest);
      return true;
    },
    [isClient, send, selfId],
  );

  return { participants: state.participants, selectable: state.selectable, sendRequest };
}
