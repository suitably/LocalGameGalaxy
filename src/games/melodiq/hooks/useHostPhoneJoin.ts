/**
 * Lets a spectator phone join the running song as a singer [ID: HOOK-MELODIQ-PHONE-JOIN]
 *
 * A phone that taps a part mic in its lyrics sends `trackSelect`. When the host has a singer list
 * and the phone is not on it, the phone is added like a phone toggled in the participant dialog;
 * `useSessionOverrideSync` then creates its singer and the phone asks for its part again once the
 * host's `songInfo` reports it (`pendingTrackRequest`). Without a list every phone sings already.
 */
import { useEffect, useRef } from 'react';
import type { WebRTCMicManager } from '../audio/WebRTCMicManager';
import type { ActivePlayer } from '../types';
import { addJoiningPhone } from '../gameplay/logic/sessionRoster';

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
  // Latest list for the listener, which subscribes once per manager.
  const stateRef = useRef({ activeParticipants, setActiveParticipants });
  useEffect(() => {
    stateRef.current = { activeParticipants, setActiveParticipants };
  });

  useEffect(() => {
    if (!manager || isClient) return;
    return manager.on('message', (peerId: string, data: unknown) => {
      if ((data as { type?: unknown } | null)?.type !== 'trackSelect') return;
      const peer = manager.getConnectedPeers().find((p) => p.peerId === peerId);
      if (!peer) return;
      const { activeParticipants: list, setActiveParticipants: setList } = stateRef.current;
      const next = addJoiningPhone(list, peer);
      if (!next) return;
      stateRef.current.activeParticipants = next; // a second tap before the re-render adds nothing
      setList(next);
    });
  }, [manager, isClient]);
}
