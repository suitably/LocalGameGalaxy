/**
 * Routes phone messages during a session [ID: HOOK-MELODIQ-PEER-MESSAGES]
 *
 * Track select and score history (`manager.on('message')`, so other listeners on the same manager
 * are not replaced) and remote-control commands (`remote.command` room events, host only).
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
import { useRoomEvents } from '../../../../modules/room-game/useRoomEvents';
import {
  joinModeOf,
  parseRemoteCommand,
  profileLatencyOf,
  type RemoteCommandEvent,
} from '../../logic/remoteCommands';
import { MELODIQ_GAME_KEY, useMelodiqRoomTransport } from '../../hooks/useMelodiqRoomTransport';
import { createLogger } from '../../../../lib/logger';

const log = createLogger('Session');

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
  const room = useMelodiqRoomTransport();
  /** Mutates the phone's player config in place (phone = peer id or device id); re-renders only when it changed. */
  const updatePhonePlayer = (id: string, apply: (p: PlayerRuntime) => boolean) => {
    const { setPlayers, playersRef } = propsRef.current;
    setPlayers((prev) => {
      const idx = prev.findIndex((p) => p.remotePeerId === id || p.config.deviceId === id);
      if (idx === -1 || !apply(prev[idx])) return prev;
      const next = [...prev];
      playersRef.current = next;
      return next;
    });
  };

  const handleCommand = (msg: RemoteCommandEvent) => {
    const peerId = msg.from;
    const { audioRef, vocalsRef, videoRef, onExit, activeSessionOverride } = propsRef.current;
    log.debug(`Remote command from ${peerId}:`, msg.command);
    switch (msg.command) {
      case 'UPDATE_PROFILE': {
        const latency = profileLatencyOf(msg);
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
      // 'next' is handled once by the host's playback (useHostPlaybackCommands: score, then the
      // next queued song); seeking to the end here as well raced with that.
      case 'exit':
        onExit();
        break;
      case 'session.join_mode': {
        const isSpectator = joinModeOf(msg) === 'spectator';
        updatePhonePlayer(peerId, (p) => {
          const wanted = isWantedByHost(activeSessionOverride, [
            p.config.deviceId,
            p.config.id,
            peerId,
          ]);
          const hide = isSpectator || !wanted;
          if (p.config.hidePitch === hide) return false;
          log.debug(`Phone ${peerId} hidePitch set to ${hide}`);
          p.config.hidePitch = hide;
          return true;
        });
        break;
      }
    }
  };

  // Phones only publish to the host; `manager` is null on a phone, so this never runs there.
  useRoomEvents<RemoteCommandEvent>({
    gameKey: MELODIQ_GAME_KEY,
    roomId: room?.roomId ?? '',
    transport: room?.transport,
    enabled: !!manager && !!room,
    onEvent: (event) => {
      const cmd = parseRemoteCommand(event);
      if (cmd && cmd.to === undefined && cmd.from !== room?.selfId) handleCommand(cmd);
    },
  });

  useEffect(() => {
    if (!manager) return;

    const onMessage = (peerId: string, data: unknown) => {
      const msg = (data ?? {}) as PeerMessage;
      const { playersRef, switchTrack, setResults } = propsRef.current;
      if (msg.type === 'trackSelect' && typeof msg.trackIndex === 'number') {
        // A spectator's part mic also means "I sing now"; a phone off the host list is added
        // there first (useHostPhoneJoin) and becomes visible through the override sync.
        const { activeSessionOverride } = propsRef.current;
        updatePhonePlayer(peerId, (p) => {
          if (!p.config.hidePitch) return false;
          if (!isWantedByHost(activeSessionOverride, [p.config.deviceId, p.config.id, peerId])) {
            return false;
          }
          p.config.hidePitch = false;
          return true;
        });
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
      }
    };

    return manager.on('message', onMessage);
  }, [manager]);
}
