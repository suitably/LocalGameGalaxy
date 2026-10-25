import { useEffect, type RefObject } from 'react';
import { type MelodiqSessionHandle } from '../gameplay/MelodiqSession';

/** Handles `melodiq_host_command` events (from the remote proxy or UI) on the host device. */
export function useHostPlaybackCommands(
  isClient: boolean,
  hasSelectedSong: boolean,
  queueLength: number,
  sessionRef: RefObject<MelodiqSessionHandle | null>,
  playNext: () => void,
) {
  useEffect(() => {
    if (isClient) return; // Clients don't handle host commands locally

    const handleHostCommand = (e: Event) => {
      const command = ((e as CustomEvent<{ command?: string }>).detail.command || '').toLowerCase();
      if (command === 'play' || command === 'pause' || command === 'toggle') {
        if (hasSelectedSong) {
          sessionRef.current?.togglePlay();
        } else if (queueLength > 0) {
          playNext();
        }
      } else if (command === 'next') {
        playNext();
      }
    };

    window.addEventListener('melodiq_host_command', handleHostCommand);
    return () => window.removeEventListener('melodiq_host_command', handleHostCommand);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirrors the original deps; playNext is recreated each render
  }, [isClient, hasSelectedSong, queueLength]);
}
