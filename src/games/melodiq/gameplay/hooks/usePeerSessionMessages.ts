/**
 * Routes phone messages during a session [ID: HOOK-MELODIQ-PEER-MESSAGES]
 *
 * Track select, score history and remote-control commands. Subscribes with
 * `manager.on('message')`, so other listeners on the same manager are not replaced.
 */
import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { PlayerRuntime } from './PlayerRuntime';
import type { ActivePlayer } from '../../types';
import type { WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { isWantedByHost } from '../logic/sessionRoster';

/** The part of a result entry a phone's history report updates. */
export interface RemoteResultEntry {
  remotePeerId?: string;
  config: { isRemote?: boolean };
}

interface PeerMessage {
  type?: string;
  trackIndex?: unknown;
  history?: unknown;
  isNewRecord?: unknown;
  command?: string;
  latency?: number;
  mode?: string;
}

interface UsePeerSessionMessagesProps<R extends RemoteResultEntry> {
  manager: WebRTCMicManager | null;
  playersRef: MutableRefObject<PlayerRuntime[]>;
  setPlayers: Dispatch<SetStateAction<PlayerRuntime[]>>;
  switchTrack: (playerIndex: number, trackIndex: number) => void;
  setResults: Dispatch<SetStateAction<R[]>>;
  onExit: () => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  vocalsRef?: RefObject<HTMLAudioElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  activeSessionOverride?: ActivePlayer[] | null;
}

export function usePeerSessionMessages<R extends RemoteResultEntry>(
  props: UsePeerSessionMessagesProps<R>,
) {
  // Latest props for the listener, which subscribes once per manager.
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const { manager } = props;
  useEffect(() => {
    if (!manager) return;

    /** Mutates the phone's player config in place; re-renders only when it changed. */
    const updatePhonePlayer = (peerId: string, apply: (p: PlayerRuntime) => boolean) => {
      const { setPlayers, playersRef } = propsRef.current;
      setPlayers((prev) => {
        const idx = prev.findIndex((p) => p.remotePeerId === peerId);
        if (idx === -1 || !apply(prev[idx])) return prev;
        const next = [...prev];
        playersRef.current = next;
        return next;
      });
    };

    const handleCommand = (peerId: string, msg: PeerMessage) => {
      const { audioRef, vocalsRef, videoRef, onExit, activeSessionOverride } = propsRef.current;
      console.log(`[Session] Remote command from ${peerId}:`, msg.command);
      switch (msg.command) {
        case 'UPDATE_PROFILE': {
          const latency = msg.latency;
          if (latency === undefined) break;
          updatePhonePlayer(peerId, (p) => {
            if (p.config.latency === latency) return false;
            p.config.latency = latency;
            return true;
          });
          break;
        }
        case 'restart':
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            if (vocalsRef?.current) vocalsRef.current.currentTime = 0;
            if (videoRef.current) videoRef.current.currentTime = 0;
          }
          break;
        case 'next':
          if (audioRef.current?.duration) {
            const endTime = audioRef.current.duration - 0.1;
            audioRef.current.currentTime = endTime;
            if (vocalsRef?.current) vocalsRef.current.currentTime = endTime;
          }
          break;
        case 'exit':
          onExit();
          break;
        case 'session.join_mode': {
          const isSpectator = msg.mode === 'spectator';
          updatePhonePlayer(peerId, (p) => {
            const wanted = isWantedByHost(activeSessionOverride, [
              p.config.deviceId,
              p.config.id,
              peerId,
            ]);
            const hide = isSpectator || !wanted;
            if (p.config.hidePitch === hide) return false;
            console.log(`[Session] Phone ${peerId} hidePitch set to ${hide}`);
            p.config.hidePitch = hide;
            return true;
          });
          break;
        }
      }
    };

    const onMessage = (peerId: string, data: unknown) => {
      const msg = (data ?? {}) as PeerMessage;
      const { playersRef, switchTrack, setResults } = propsRef.current;
      if (msg.type === 'trackSelect' && typeof msg.trackIndex === 'number') {
        const idx = playersRef.current.findIndex((p) => p.remotePeerId === peerId);
        if (idx !== -1) switchTrack(idx, msg.trackIndex);
      } else if (msg.type === 'history_report') {
        setResults((prev) =>
          prev.map((r) =>
            r.remotePeerId === peerId && r.config.isRemote
              ? { ...r, history: msg.history, isNewRecord: msg.isNewRecord, loadingHistory: false }
              : r,
          ),
        );
      } else if (msg.type === 'remote.command') {
        handleCommand(peerId, msg);
      }
    };

    return manager.on('message', onMessage);
  }, [manager]);
}
