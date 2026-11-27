import { useEffect, useRef, type RefObject } from 'react';
import { type MelodiqSessionHandle } from '../gameplay/MelodiqSession';

/** Handles `melodiq_host_command` events (from the remote proxy or UI) on the host device. */
export function useHostPlaybackCommands(
  isClient: boolean,
  hasSelectedSong: boolean,
  queueLength: number,
  sessionRef: RefObject<MelodiqSessionHandle | null>,
  playNext: () => void,
) {
  // The latest values: `playNext` closes over the queue and the selected song of this render, so a
  // listener bound once must not call an old copy (it would pop a stale queue).
  const latest = useRef({ hasSelectedSong, queueLength, playNext });
  useEffect(() => {
    latest.current = { hasSelectedSong, queueLength, playNext };
  });

  useEffect(() => {
    if (isClient) return; // Clients don't handle host commands locally

    const handleHostCommand = (e: Event) => {
      const command = ((e as CustomEvent<{ command?: string }>).detail.command || '').toLowerCase();
      const current = latest.current;
      if (command === 'play' || command === 'pause' || command === 'toggle') {
        if (current.hasSelectedSong) {
          sessionRef.current?.togglePlay();
        } else if (current.queueLength > 0) {
          current.playNext();
        }
      } else if (command === 'next') {
        current.playNext();
      }
    };

    window.addEventListener('melodiq_host_command', handleHostCommand);
    return () => window.removeEventListener('melodiq_host_command', handleHostCommand);
  }, [isClient, sessionRef]);
}
