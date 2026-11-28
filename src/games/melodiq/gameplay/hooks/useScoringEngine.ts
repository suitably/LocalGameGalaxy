import { useEffect, useRef, useCallback } from 'react';
import { type PlayerRuntime } from './PlayerRuntime';
import { type PitchResult } from '../../audio/MicrophoneManager';
import { type RatingType } from '../ScoreDisplay';
import { activeNoteIndex } from '../logic/noteScoring';
import { matchPitch, sungBeat } from '../logic/pitchMatch';
import { notesOfTrack, type UseScoringEngineProps } from './scoringEngineTypes';
import { startSteadyTicker } from '../../../../lib/utils/steadyTicker';

/** Pace of the scoring loop while the host window gets no animation frames (hidden/covered). */
const BACKGROUND_TICK_MS = 33;

export type { PlaybackUpdateState } from './scoringEngineTypes';

/**
 * `useScoringEngine` — Real-Time Pitch Matching & Scoring Engine
 *
 * The core scoring hook for Melodiq. Runs a high-frequency `requestAnimationFrame`
 * loop that, on every frame:
 * 1. Reads current audio position from `audioRef.current.currentTime` (single source of truth).
 * 2. Identifies the active UltraStar note at that timestamp using `parsedSong`.
 * 3. For each active player, reads the current pitch from their `MicrophoneManager` or
 *    `WebRTCMicManager` (or uses `devPitchOverride` in dev mode).
 * 4. Compares the detected MIDI note to the target note, accounting for octave shifts
 *    (singers naturally sing at half/double octave of the reference pitch).
 * 5. Calculates a normalized score contribution based on how close the pitch is
 *    (within a configurable semitone tolerance).
 * 6. Applies the `goldenNoteMultiplier` for `*` note types and the per-track `trackScoreWeights`.
 * 7. Updates the `ScoreDisplay` UI ref and the `scores` state at a throttled rate.
 *
 * ## Modes
 * - **Active (Host)**: Full pitch detection from local mic or WebRTC peers.
 * - **Passive (TV Mode)**: Reads pre-calculated pitch and score state from `passiveState`
 *   (received via `GAME_STATE` BroadcastChannel). No local audio capture.
 * - **Client (Phone)**: Reduced loop — only sends local mic pitch upstream, no scoring.
 *
 * ## Timing Invariant
 * **Never** use `setTimeout`/`setInterval` for note timing. The only valid clock
 * is `audioRef.current.currentTime`, which is synchronized with the browser's
 * audio renderer and is immune to JavaScript timer throttling.
 *
 * @param props - See `UseScoringEngineProps` for full prop documentation.
 */
export function useScoringEngine({
  players,
  ready,
  audioRef,
  vocalsRef: _vocalsRef,
  videoRef: _videoRef,
  scoreDisplayRef,
  progressLineRef,
  isPlayingRef,
  parsedSong,
  bpmMultiplier,
  trackScoreWeights,
  goldenNoteMultiplier,
  devPitchOverride,
  isPassive,
  passiveState: _passiveState,
  isClient,
  _duration,
  micLatency = 0,
  onPlaybackUpdate,
  setScores,
  virtualTimeRef,
}: UseScoringEngineProps) {
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastScoreUpdateRef = useRef<number>(0);
  const updateLoopRef = useRef<(() => void) | undefined>(undefined);

  const ULTRASTAR_BEAT_DIVISOR = 4;

  const processPlayer = useCallback(
    (player: PlayerRuntime, devOverride: number | null, deltaTimeMs: number) => {
      let pitch: (PitchResult & { ageMs?: number }) | null = null;
      const effectiveBpmMultiplier = (bpmMultiplier || 1) * ULTRASTAR_BEAT_DIVISOR;
      const beatDuration = 60000 / ((parsedSong?.bpm || 120) * effectiveBpmMultiplier);

      if (devOverride !== null) {
        pitch = {
          frequency: 440 * Math.pow(2, (devOverride - 69) / 12),
          note: devOverride,
          volume: 1.0,
        };
      } else if (player.config.deviceId === 'BOT') {
        if (audioRef.current && isPlayingRef.current && parsedSong) {
          const latency = player.config.latency || 0;
          const currentBeat =
            (audioRef.current.currentTime * 1000 - latency - (parsedSong.gap || 0)) / beatDuration;

          const tIdx = player.trackIndex;
          const notesSource = notesOfTrack(parsedSong, tIdx);

          if (notesSource) {
            const activeNote = notesSource[activeNoteIndex(notesSource, currentBeat)];

            if (activeNote) {
              pitch = {
                frequency: 440 * Math.pow(2, (activeNote.pitch - 69) / 12),
                note: activeNote.pitch,
                volume: 0.8,
              };
            }
          }
        }
      } else {
        pitch =
          devOverride !== null
            ? { frequency: 440, note: devOverride, volume: 0.5 }
            : player.getPitch();
      }

      if (!isPlayingRef.current) {
        pitch = null;
      }

      player.pitchRef.current = pitch;

      if (pitch && pitch.note > 0 && isPlayingRef.current && parsedSong && audioRef.current) {
        // A phone's pitch is dated (`ageMs`): score it on the note due when it was sung
        const currentBeat = sungBeat({
          songTimeMs: audioRef.current.currentTime * 1000,
          latencyMs: (player.config.latency || 0) + micLatency,
          ageMs: pitch.ageMs,
          gapMs: parsedSong.gap || 0,
          beatDurationMs: beatDuration,
        });

        const tIdx = player.trackIndex;
        const notesSource = notesOfTrack(parsedSong, tIdx);

        if (!notesSource || notesSource.length === 0) return;

        const match = matchPitch({
          notes: notesSource,
          beat: currentBeat,
          sungNote: pitch.note,
          deltaTimeMs,
          beatDurationMs: beatDuration,
          goldenNoteMultiplier,
          scoreWeight:
            trackScoreWeights.length > tIdx ? trackScoreWeights[tIdx] : trackScoreWeights[0] || 1,
        });

        if (match.kind === 'hit') {
          const activeIndex = match.noteIndex;
          if (!player.trackScores[tIdx]) player.trackScores[tIdx] = 0;
          player.trackScores[tIdx] += match.points;
          player.score = Math.round(Object.values(player.trackScores).reduce((a, b) => a + b, 0));

          const activeSegment = player.activeSegments[tIdx];
          const wasHitting = activeSegment ? activeSegment.noteIndex === activeIndex : false;

          if (!wasHitting) {
            player.combo += 1;
            if (player.combo > player.maxCombo) player.maxCombo = player.combo;

            const rating: RatingType = match.rating;
            const hitScore = Math.round(player.trackScores[tIdx] || 0);

            player.lastHit = {
              rating,
              score: hitScore,
              timestamp: Date.now(),
            };

            scoreDisplayRef.current?.triggerHit(player.config.id, rating, player.combo, hitScore);
          } else if (Math.random() < 0.1) {
            scoreDisplayRef.current?.triggerHit(
              player.config.id,
              'Good',
              player.combo,
              Math.round(player.trackScores[tIdx]),
            );
          }

          const record = player.segmentsRef.current;
          if (record) {
            const activeSeg = player.activeSegments[tIdx];

            if (activeSeg && activeSeg.trackIndex === tIdx && activeSeg.noteIndex === activeIndex) {
              activeSeg.endBeat = currentBeat;
            } else {
              const newSegment = {
                noteIndex: activeIndex,
                startBeat: currentBeat,
                endBeat: currentBeat,
                trackIndex: tIdx,
              };
              player.activeSegments[tIdx] = newSegment;

              if (!record[activeIndex]) record[activeIndex] = [];
              record[activeIndex].push(newSegment);
            }
          }
        } else if (match.kind === 'miss') {
          if (player.activeSegments[tIdx] !== null) {
            player.combo = 0;
            const hitScore = Math.round(player.trackScores[tIdx] || 0);
            player.lastHit = {
              rating: 'Miss',
              score: hitScore,
              timestamp: Date.now(),
            };

            scoreDisplayRef.current?.triggerHit(player.config.id, 'Miss', 0, hitScore);
          }
          player.activeSegments[tIdx] = null;
        } else if (player.activeSegments[tIdx] !== null) {
          player.activeSegments[tIdx] = null;
        }
      }
    },
    [
      audioRef,
      isPlayingRef,
      parsedSong,
      bpmMultiplier,
      trackScoreWeights,
      goldenNoteMultiplier,
      scoreDisplayRef,
      micLatency,
    ],
  );

  // One pending frame at most: the background ticker below also calls the loop, and frames
  // requested while the page is hidden must not pile up into parallel loops.
  const scheduleNextFrame = useCallback(() => {
    cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(() => updateLoopRef.current?.());
  }, []);

  const updateLoop = useCallback(() => {
    const now = performance.now();
    let deltaTime = now - lastTimeRef.current;
    if (deltaTime > 100) deltaTime = 100; // Cap to 100ms to prevent massive jumps when tab is backgrounded
    lastTimeRef.current = now;

    const duration =
      audioRef.current &&
      Number.isFinite(audioRef.current.duration) &&
      audioRef.current.duration > 0
        ? audioRef.current.duration
        : _duration > 0
          ? _duration
          : 0;

    let currentTime =
      isPassive && isClient
        ? virtualTimeRef.current!
        : audioRef.current
          ? audioRef.current.currentTime
          : 0;

    // Interpolate time for fully passive clients
    if (isPassive && isClient && isPlayingRef.current) {
      currentTime += deltaTime / 1000;
      (virtualTimeRef as React.MutableRefObject<number>).current = currentTime;
    }

    if (onPlaybackUpdate) {
      onPlaybackUpdate({
        isPlaying: isPassive
          ? (isPlayingRef.current ?? false)
          : !(audioRef.current?.paused ?? true),
        currentTime,
        duration,
        progress: duration > 0 ? (currentTime / duration) * 100 : 0,
        // Built only when the host actually sends a state (useHostGameUpdate)
        getPlayers: isPassive
          ? undefined
          : () =>
              players.map((p) => ({
                config: p.config,
                id: p.config.id,
                name: p.config.name,
                hue: p.config.hue,
                score: p.score,
                trackScores: p.trackScores,
                currentPitch: p.pitchRef.current,
                activeSegments: p.activeSegments,
                sungSegments: p.segmentsRef.current,
                combo: p.combo,
                lastHit: p.lastHit,
              })),
      });
    }

    if (progressLineRef.current) {
      if (duration > 0) {
        const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
        progressLineRef.current.style.transform = `scaleX(${progress / 100})`;
      }
    }

    if (isPassive) {
      scheduleNextFrame();
      return;
    }

    players.forEach((player, index) => {
      const override = index === 0 ? devPitchOverride : null;
      processPlayer(player, override, deltaTime);
    });

    if (now - lastScoreUpdateRef.current > 150) {
      const newScores: Record<string, number> = {};
      players.forEach((p) => {
        const currentTrackScore = p.trackScores[p.trackIndex] || 0;
        newScores[p.config.id] = Math.round(currentTrackScore);
      });
      setScores?.(newScores);
      lastScoreUpdateRef.current = now;
    }

    scheduleNextFrame();
  }, [
    audioRef,
    isPassive,
    isClient,
    isPlayingRef,
    _duration,
    onPlaybackUpdate,
    progressLineRef,
    players,
    devPitchOverride,
    processPlayer,
    setScores,
    virtualTimeRef,
    scheduleNextFrame,
  ]);

  useEffect(() => {
    updateLoopRef.current = updateLoop;
  }, [updateLoop]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    if (!ready) return;

    requestRef.current = requestAnimationFrame(() => updateLoopRef.current?.());

    // The host scores and feeds the TV from this loop. A minimized or covered host window gets no
    // animation frames, so a worker ticker keeps it running then (it idles while frames come).
    const stopTicker = isPassive
      ? null
      : startSteadyTicker(BACKGROUND_TICK_MS, () => {
          if (performance.now() - lastTimeRef.current > BACKGROUND_TICK_MS * 1.5) {
            updateLoopRef.current?.();
          }
        });

    return () => {
      stopTicker?.();
      cancelAnimationFrame(requestRef.current);
    };
  }, [ready, isPassive]);
}
