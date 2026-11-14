import { useEffect, useRef } from 'react';
import { storage, STORAGE_KEYS } from '../../../../lib/storage';
import { PlayerRuntime } from './PlayerRuntime';
import { type PassiveGameState } from '../../types';
import { type ScoreDisplayHandle } from '../ScoreDisplay';
import { PASSIVE_PLAY_RETRY_MS, shouldRetryPassivePlay } from '../logic/passivePlayback';
import { createRemoteClock } from '../logic/remoteClock';
import { correctDrift, FOLLOWER_DRIFT_POLICY } from '../logic/mediaDrift';

/** Shortest time between two corrective seeks of a passive screen's media. */
const FOLLOWER_SEEK_COOLDOWN_MS = 1500;
/** A paused passive screen is put on the host's position when it is further off than this. */
const RESUME_ALIGN_SEC = 0.02;
/** WebRTC data channel on a LAN; the phone has no audio of its own to measure against. */
const PHONE_TRANSPORT_SEC = 0.02;
/** The phone's lyric clock is re-set when it is further from the host's than this. */
const PHONE_CLOCK_TOLERANCE_SEC = 0.03;

interface UsePassiveSyncProps {
  isPassive: boolean;
  passiveState: PassiveGameState | null;
  isClient: boolean;
  isTVMode?: boolean;
  players: PlayerRuntime[];
  setPlayers: React.Dispatch<React.SetStateAction<PlayerRuntime[]>>;
  playersRef: React.RefObject<PlayerRuntime[]>;
  scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  vocalsRef?: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlayingRef: React.RefObject<boolean>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFinished: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPausedForScore: React.Dispatch<React.SetStateAction<boolean>>;
  setPassivePlayBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  virtualTimeRef: React.RefObject<number>;
}

export function usePassiveSync({
  isPassive,
  passiveState,
  isClient,
  isTVMode: _isTVMode = false,
  setPlayers,
  playersRef,
  scoreDisplayRef,
  audioRef,
  vocalsRef,
  videoRef,
  isPlayingRef,
  setIsPlaying,
  setIsFinished,
  setIsPausedForScore,
  setPassivePlayBlocked,
  virtualTimeRef,
}: UsePassiveSyncProps) {
  const nextPlayAttemptRef = useRef(0);
  const hostClockRef = useRef(createRemoteClock());
  const lastFollowerSeekRef = useRef(0);

  useEffect(() => {
    if (!isPassive) return;

    const handleGameState = (passiveState: PassiveGameState) => {
      if (!passiveState) return;

      const remotePlayers = passiveState.players || [];
      const currentIds = (playersRef.current || []).map((p) => p.config.id).join(',');
      const remoteIds = remotePlayers.map((p) => p.id).join(',');

      if (currentIds !== remoteIds) {
        const newPlayers = remotePlayers.map(
          (p) =>
            new PlayerRuntime({
              id: p.id,
              name: p.name,
              hue: p.hue,
              isRemote: true,
              // Lets a phone find its own singer (lane scope)
              deviceId: p.config?.deviceId,
            }),
        );
        setPlayers(newPlayers);
        playersRef.current = newPlayers;
      }

      remotePlayers.forEach((pState, idx) => {
        const rt = playersRef.current?.[idx];
        if (rt) {
          rt.pitchRef.current = pState.currentPitch;
          rt.activeSegments = pState.activeSegments;
          if (pState.sungSegments) {
            rt.segmentsRef.current = pState.sungSegments;
          }
          rt.trackScores = pState.trackScores;
          rt.score = pState.score;
          rt.combo = pState.combo;

          if (pState.lastHit && (!rt.lastHit || pState.lastHit.timestamp > rt.lastHit.timestamp)) {
            rt.lastHit = pState.lastHit;
            scoreDisplayRef.current?.triggerHit(
              pState.id,
              pState.lastHit.rating,
              pState.combo,
              pState.lastHit.score,
            );
          }
        }
      });

      const now = Date.now();
      // The host's song position, free of transport jitter (see remoteClock.ts)
      const perfNow = performance.now();
      const hostClock = hostClockRef.current;
      hostClock.update(passiveState.currentTime, passiveState.isPlaying, perfNow);
      const hostTime = hostClock.now(perfNow);
      const seekAll = (time: number) => {
        if (audioRef.current) audioRef.current.currentTime = time;
        if (vocalsRef?.current) vocalsRef.current.currentTime = time;
        if (videoRef.current) videoRef.current.currentTime = time;
      };
      const retryPlay =
        !isClient &&
        shouldRetryPassivePlay(
          passiveState.isPlaying,
          audioRef.current,
          now,
          nextPlayAttemptRef.current,
        );
      if (passiveState.isPlaying !== isPlayingRef.current || retryPlay) {
        nextPlayAttemptRef.current = now + PASSIVE_PLAY_RETRY_MS;
        // Immediately update ref to prevent duplicate trigger loops
        if (isPlayingRef.current !== undefined) {
          (isPlayingRef as any).current = passiveState.isPlaying;
        }

        if (passiveState.isPlaying) {
          // Paused media seeks for free: start exactly where the host is, stems included
          if (
            audioRef.current &&
            Math.abs(audioRef.current.currentTime - hostTime) > RESUME_ALIGN_SEC
          ) {
            seekAll(hostTime);
          } else if (audioRef.current && vocalsRef?.current) {
            vocalsRef.current.currentTime = audioRef.current.currentTime;
          }
          const tryPlay = async () => {
            setIsPlaying(true);
            try {
              if (audioRef.current) await audioRef.current.play();
              if (vocalsRef?.current) vocalsRef.current.play().catch(() => {});
              if (videoRef.current) videoRef.current.play().catch(() => {});
              setPassivePlayBlocked(false);
            } catch (e: any) {
              console.warn('[Session] Passive play blocked by autoplay policy:', e.name);
            }
          };
          tryPlay();
        } else {
          audioRef.current?.pause();
          vocalsRef?.current?.pause();
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      }

      setIsFinished((prev) => (passiveState.isFinished !== prev ? passiveState.isFinished : prev));
      setIsPausedForScore((prev) =>
        passiveState.isPausedForScore !== prev ? passiveState.isPausedForScore : prev,
      );

      // The host's clock scores the singers, this screen's audio is what they hear: keep the
      // audio on the host's position with small rate changes, and seek only when far off.
      const audio = audioRef.current;
      if (!isClient && audio) {
        const following =
          passiveState.isPlaying && isPlayingRef.current && !audio.paused && !audio.seeking;
        if (!following) {
          if (audio.playbackRate !== 1 && !passiveState.isPlaying) audio.playbackRate = 1;
        } else {
          const correction = correctDrift(hostTime - audio.currentTime, 1, FOLLOWER_DRIFT_POLICY);
          if (correction.kind === 'rate') {
            if (audio.playbackRate !== correction.rate) audio.playbackRate = correction.rate;
          } else if (perfNow - lastFollowerSeekRef.current > FOLLOWER_SEEK_COOLDOWN_MS) {
            lastFollowerSeekRef.current = perfNow;
            audio.playbackRate = 1;
            seekAll(hostTime);
          }
        }
      }

      if (isClient) {
        // The phone plays no audio; its lyrics run on the estimated host clock.
        const estimatedHostTime = hostTime + PHONE_TRANSPORT_SEC;
        const drift = Math.abs(virtualTimeRef.current! - estimatedHostTime);
        if (!isPlayingRef.current || drift > PHONE_CLOCK_TOLERANCE_SEC) {
          (virtualTimeRef as any).current = estimatedHostTime;
        }
      }
    };

    if (passiveState) {
      handleGameState(passiveState);
    }

    const onEvent = (e: any) => handleGameState(e.detail);
    window.addEventListener('melodiq_tv_game_state', onEvent);
    return () => window.removeEventListener('melodiq_tv_game_state', onEvent);
  }, [isPassive, isClient]);

  // Sync local pitch directly from PhoneClientEngine (bypassing network latency for the local cursor)
  useEffect(() => {
    if (!isClient) return;

    let myName = 'Phone';
    const storedProfile = storage.get(STORAGE_KEYS.CLIENT_PROFILE);
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        if (parsed.name) myName = parsed.name;
      } catch (err) {}
    }

    const handleLocalPitch = (e: any) => {
      const { pitch } = e.detail;
      playersRef.current?.forEach((rt) => {
        if (rt.config.name === myName) {
          rt.pitchRef.current = pitch;
        }
      });
    };

    window.addEventListener('melodiq_local_pitch', handleLocalPitch);
    return () => window.removeEventListener('melodiq_local_pitch', handleLocalPitch);
  }, [isClient, playersRef]);
}
