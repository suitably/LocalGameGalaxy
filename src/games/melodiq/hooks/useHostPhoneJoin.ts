/**
 * Lets a spectator phone join the running song as a singer [ID: HOOK-MELODIQ-PHONE-JOIN]
 *
 * A phone that taps a part mic in its lyrics sends the `track.select` remote command. When the
 * host has a singer list and the phone is not on it, the phone is added like a phone toggled in
 * the participant dialog; `useSessionOverrideSync` then creates its singer and the phone asks for
 * its part again once the host's `songInfo` reports it (`pendingTrackRequest`). Without a list
 * every phone sings already.
 */
import { useEffect, useRef } from 'react';
import type { WebRTCMicManager } from '../audio/WebRTCMicManager';
import type { ActivePlayer } from '../types';
import { addJoiningPhone } from '../gameplay/logic/sessionRoster';
import { useRoomEvents } from '../../../modules/room-game/useRoomEvents';
import { parseRemoteCommand, type RemoteCommandEvent } from '../logic/remoteCommands';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from './useMelodiqRoomTransport';

interface UseHostPhoneJoinProps {
  manager: WebRTCMicManager | null;
  isClient: boolean;
  activeParticipants?: ActivePlayer[] | null;
  setActiveParticipants: (p: ActivePlayer[] | null) => void;
}

export function useHostPhoneJoin({
  manager,
  isClient,
  activeParticipants,
  setActiveParticipants,
}: UseHostPhoneJoinProps) {
  // Latest list for the listener, which subscribes once per room.
  const stateRef = useRef({ activeParticipants, setActiveParticipants });
  useEffect(() => {
    stateRef.current = { activeParticipants, setActiveParticipants };
  });
  const room = useMelodiqRoomTransport();

  useRoomEvents<RemoteCommandEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!manager && !isClient && !!room,
    onEvent: (event) => {
      const cmd = parseRemoteCommand(event);
      if (!manager || !cmd || cmd.command !== 'track.select' || cmd.from === room?.selfId) return;
      // `from` is the phone's device id, stamped by the host transport
      const peer = manager.getConnectedPeers().find((p) => p.deviceId === cmd.from);
      if (!peer) return;
      const { activeParticipants: list, setActiveParticipants: setList } = stateRef.current;
      const next = addJoiningPhone(list, peer);
      if (!next) return;
      stateRef.current.activeParticipants = next; // a second tap before the re-render adds nothing
      setList(next);
    },
  });
}
