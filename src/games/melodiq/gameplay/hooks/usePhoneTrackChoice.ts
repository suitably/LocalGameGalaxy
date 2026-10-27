import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientEngine } from '../../PhoneClientEngine';
import type { ActivePlayer } from '../../types';
import { isWantedByHost } from '../logic/sessionRoster';
import {
  buildTrackSelectMessage,
  isDuet,
  TRACK_ASSIGNED_EVENT,
  type TrackAssignment,
} from '../logic/trackChoice';

// The host's last `songInfo` may arrive before the picker mounts.
let lastAssignment: TrackAssignment | null = null;

/** Called by the phone's message router for every `songInfo` with a part. */
export function reportTrackAssignment(assignment: TrackAssignment) {
  lastAssignment = assignment;
  window.dispatchEvent(new CustomEvent(TRACK_ASSIGNED_EVENT, { detail: assignment }));
}

interface Args {
  isClient: boolean;
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
}

/**
 * Phone side of the duet part choice: keeps the chosen part (P1 = 0, P2 = 1) and sends it to the
 * host as `trackSelect`. The host maps it to this phone's singer by peer id
 * (`usePeerSessionMessages`). Re-sent after a reconnect, because the host then creates a new singer.
 * Part names and the current part come from the host's `songInfo` (sent only to phones that have a
 * singer), so the phone does not parse the song for this and a switch made on the host shows here.
 */
export function usePhoneTrackChoice({ isClient, clientDeviceId, activeSessionOverride }: Args) {
  const { sendClientData, isConnected } = useClientEngine();
  const [assignment, setAssignment] = useState<TrackAssignment | null>(() => lastAssignment);
  const trackNames = assignment?.tracks ?? [];
  const trackIndex = assignment?.trackIndex ?? 0;
  const trackCount = trackNames.length;

  useEffect(() => {
    if (!isClient) return;
    const onAssigned = (e: Event) => setAssignment((e as CustomEvent<TrackAssignment>).detail);
    window.addEventListener(TRACK_ASSIGNED_EVENT, onAssigned);
    return () => window.removeEventListener(TRACK_ASSIGNED_EVENT, onAssigned);
  }, [isClient]);

  // `songInfo` already means the host has a singer for this phone; a host list must agree too.
  const canChoose =
    isClient &&
    isDuet(trackCount) &&
    (!activeSessionOverride || isWantedByHost(activeSessionOverride, [clientDeviceId]));

  const send = useCallback(
    (index: number) => {
      const message = buildTrackSelectMessage(index, trackCount);
      if (message) sendClientData(message);
    },
    [sendClientData, trackCount],
  );

  const select = useCallback(
    (index: number) => {
      setAssignment((prev) => {
        lastAssignment = prev && { ...prev, trackIndex: index };
        return lastAssignment;
      });
      send(index);
    },
    [send],
  );

  const wasConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current && canChoose && trackIndex > 0) send(trackIndex);
    wasConnectedRef.current = isConnected;
  }, [isConnected, canChoose, trackIndex, send]);

  return { canChoose, trackIndex, select, trackNames };
}
