import {
  useState,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import type { ActivePlayer } from '../../types';
import type { Song } from '../../db';
import type { SongWithNotes } from '../PitchVisualizer';
import type { MicRemotePeer, WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { assignMicSlots, buildInitialConfigs, loadSessionInputs } from '../logic/sessionRoster';
import { useSessionOverrideSync } from './useSessionOverrideSync';
import { usePeerRosterSync } from './usePeerRosterSync';
import { usePeerSessionMessages, type RemoteResultEntry } from './usePeerSessionMessages';
import { useBroadcastSongInfo } from './useBroadcastSongInfo';

interface UseSessionPlayersProps<R extends RemoteResultEntry> {
  manager: WebRTCMicManager | null;
  activePeers: MicRemotePeer[];
  parsedSong: SongWithNotes | null;
  song: Song;
  switchTrack: (playerIndex: number, trackIndex: number) => void;
  setResults: Dispatch<SetStateAction<R[]>>;
  onExit: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  vocalsRef?: RefObject<HTMLAudioElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  activeSessionOverride?: ActivePlayer[] | null;
  isPassive?: boolean;
}

/** Owns the session's `players` and `ready`; roster sync, phone messages and song info are delegated. */
export function useSessionPlayers<R extends RemoteResultEntry>({
  manager,
  activePeers,
  parsedSong,
  song,
  switchTrack,
  setResults,
  onExit,
  audioRef,
  vocalsRef,
  videoRef,
  activeSessionOverride,
  isPassive = false,
}: UseSessionPlayersProps<R>) {
  const [players, setPlayers] = useState<PlayerRuntime[]>([]);
  const [ready, setReady] = useState(false);
  const playersRef = useRef<PlayerRuntime[]>([]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Initialization: players from the stored (or overridden) session, local singers get mics
  useEffect(() => {
    const { profiles, activeSession, micSlots } = loadSessionInputs(activeSessionOverride);
    const session = assignMicSlots(activeSession, micSlots);

    if (profiles && session.length > 0) {
      const newPlayers = buildInitialConfigs(session, profiles).map((c) => new PlayerRuntime(c));
      for (const p of newPlayers) {
        if (!p.config.isRemote) {
          p.start().catch((e) => console.warn('[Session] Failed to start player mic:', e));
        }
      }
      console.log('[MelodiqSession] Initialized players:', newPlayers.length);
      setPlayers(newPlayers);
      playersRef.current = newPlayers;
    } else {
      console.warn('No dynamic settings found, falling back to empty session.');
    }
    setReady(true);

    return () => {
      console.log('[MelodiqSession] Cleaning up players on unmount...');
      // Copy first: the ref may change while players stop
      for (const p of [...playersRef.current]) {
        p.stop().catch((e) => console.warn('Error stopping player:', e));
      }
    };
    // Runs once per session mount; later override changes go through useSessionOverrideSync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSessionOverrideSync({
    manager,
    activePeers,
    activeSessionOverride,
    ready,
    isPassive,
    setPlayers,
    playersRef,
  });
  usePeerRosterSync({ manager, activePeers, activeSessionOverride, setPlayers, playersRef });
  usePeerSessionMessages({
    manager,
    playersRef,
    setPlayers,
    switchTrack,
    setResults,
    onExit,
    audioRef,
    vocalsRef,
    videoRef,
    activeSessionOverride,
  });
  useBroadcastSongInfo({ manager, parsedSong, song, players });

  return { players, setPlayers, playersRef, ready };
}
