import { useCallback, useEffect, useRef, useState } from 'react';
import { useClientEngine } from '../../PhoneClientEngine';
import type { ActivePlayer } from '../../types';
import { isWantedByHost } from '../logic/sessionRoster';
import { buildTrackSelectMessage, isDuet } from '../logic/trackChoice';

interface Args {
  isClient: boolean;
  parsedSong: { tracks?: { name: string }[] } | null;
  clientDeviceId?: string;
  activeSessionOverride?: ActivePlayer[] | null;
}

/**
 * Phone side of the duet part choice: keeps the chosen part (P1 = 0, P2 = 1) and sends it to the
 * host as `trackSelect`. The host maps it to this phone's singer by peer id
 * (`usePeerSessionMessages`). Re-sent after a reconnect, because the host then creates a new singer.
 */
export function usePhoneTrackChoice({
  isClient,
  parsedSong,
  clientDeviceId,
  activeSessionOverride,
}: Args) {
  const { sendClientData, isConnected } = useClientEngine();
  const [trackIndex, setTrackIndex] = useState(0);
  const trackNames = (parsedSong?.tracks ?? []).map((t, i) => t.name || `Player ${i + 1}`);
  const trackCount = trackNames.length;

  const canChoose =
    isClient && isDuet(trackCount) && isWantedByHost(activeSessionOverride, [clientDeviceId]);

  const send = useCallback(
    (index: number) => {
      const message = buildTrackSelectMessage(index, trackCount);
      if (message) sendClientData(message);
    },
    [sendClientData, trackCount],
  );

  const select = useCallback(
    (index: number) => {
      setTrackIndex(index);
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
