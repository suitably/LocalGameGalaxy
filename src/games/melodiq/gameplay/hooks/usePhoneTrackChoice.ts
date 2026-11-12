import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientEngine } from '../../PhoneClientEngine';
import type { ActivePlayer } from '../../types';
import { isWantedByHost } from '../logic/sessionRoster';
import {
  buildTrackSelectMessage,
  pendingTrackRequest,
  TRACK_ASSIGNED_EVENT,
  type TrackAssignment,
} from '../logic/trackChoice';
import type { LyricsPartChoice } from '../lyrics/LyricsPartContext';

// The host's last `songInfo` may arrive before the lyrics mount.
let lastAssignment: TrackAssignment | null = null;

/** Called by the phone's message router for every `songInfo` with a part. */
export function reportTrackAssignment(assignment: TrackAssignment) {
  lastAssignment = assignment;
  window.dispatchEvent(new CustomEvent(TRACK_ASSIGNED_EVENT, { detail: assignment }));
}

interface Args {
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
}

/**
 * Phone side of the part choice behind the lyrics' part mics: the singer picks its own part, a
 * spectator joins the song with it. Both send `trackSelect`; the host switches this phone's singer
 * (`usePeerSessionMessages`) or first adds the phone to its singer list (`useHostPhoneJoin`). The
 * wanted part is asked for again until the host's `songInfo` reports it, because a joining phone
 * gets its singer (on P1) only after the list change. Re-sent after a reconnect, too.
 */
export function usePhoneTrackChoice({
  clientDeviceId,
  activeSessionOverride,
}: Args): LyricsPartChoice {
  const { sendClientData, isConnected } = useClientEngine();
  const [assignment, setAssignment] = useState<TrackAssignment | null>(() => lastAssignment);
  const desiredRef = useRef<number | null>(null);

  useEffect(() => {
    const onAssigned = (e: Event) => setAssignment((e as CustomEvent<TrackAssignment>).detail);
    window.addEventListener(TRACK_ASSIGNED_EVENT, onAssigned);
    return () => window.removeEventListener(TRACK_ASSIGNED_EVENT, onAssigned);
  }, []);

  // `songInfo` means the host has a player for this phone; it sings unless hidden or unlisted.
  const singing =
    !!assignment?.singing &&
    (!activeSessionOverride || isWantedByHost(activeSessionOverride, [clientDeviceId]));
  const current = singing ? assignment : null;

  const send = useCallback(
    (index: number, trackCount: number) => {
      const message = buildTrackSelectMessage(index, trackCount);
      if (message) sendClientData(message);
    },
    [sendClientData],
  );

  const select = useCallback(
    (index: number, trackCount: number) => {
      desiredRef.current = index;
      if (singing) {
        setAssignment((prev) => {
          lastAssignment = prev && { ...prev, trackIndex: index };
          return lastAssignment;
        });
      }
      send(index, trackCount);
    },
    [send, singing],
  );

  // A joining phone first gets a singer on the host's default part: ask for the wanted one again.
  useEffect(() => {
    const pending = pendingTrackRequest(desiredRef.current, current);
    desiredRef.current = pending;
    if (pending !== null && current) send(pending, current.tracks.length);
  }, [current, send]);

  const wasConnectedRef = useRef(isConnected);
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current && current && current.trackIndex > 0) {
      send(current.trackIndex, current.tracks.length);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, current, send]);

  return { activeTrack: current ? current.trackIndex : null, select };
}
