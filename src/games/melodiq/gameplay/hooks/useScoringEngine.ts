import { useEffect, useRef, useCallback } from 'react';
import { type PlayerRuntime } from './PlayerRuntime';
import { type PitchResult } from '../../audio/MicrophoneManager';
import { type RatingType, type ScoreDisplayHandle } from '../ScoreDisplay';

/**
 * Props for `useScoringEngine`. Separate from the component signature to allow
 * clear documentation of each timing and mode control surface.
 */
interface UseScoringEngineProps {
    /** All connected players (local + remote) with their `MicrophoneManager` / `WebRTCMicManager` references. */
    players: PlayerRuntime[];
    /** Set to `true` once audio is loaded and playback can begin. Gates the rAF loop. */
    ready: boolean;
    /** Ref to the main mixed audio element (used for `currentTime` as the timing source of truth). */
    audioRef: React.RefObject<HTMLAudioElement | null>;
    /** Ref to the optional vocals-only audio element (played/muted alongside the main track). */
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
    progressLineRef: React.RefObject<HTMLDivElement | null>;
    /** Ref flag indicating whether audio is actively playing (used to skip scoring when paused). */
    isPlayingRef: React.RefObject<boolean>;
    /** The fully parsed UltraStar song data (tracks, notes, BPM, GAP). */
    parsedSong: any;
    /** Multiplier applied to BPM for slower/faster lyric scroll (default 1.0). */
    bpmMultiplier: number;
    /** Per-track score weights: `[1.0]` for single singer, `[0.5, 0.5]` for duets. */
    trackScoreWeights: number[];
    /** Score multiplier for golden notes (`*` type). Typically 2.0. */
    goldenNoteMultiplier: number;
    /** Dev-only: Override all pitch detection with a fixed MIDI note number for testing. */
    devPitchOverride: number | null;
    /** If `true`, this instance is in TV/passive mode — reads pitch from `passiveState` rather than mic. */
    isPassive: boolean;
    /** State object received from the host via `GAME_STATE` BroadcastChannel message (TV mode). */
    passiveState: any;
    /** If `true`, this instance is a remote phone client — runs a reduced local loop. */
    isClient: boolean;
    _duration: number;
    onPlaybackUpdate?: (state: any) => void;
    setScores?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    /** Ref to the current virtual audio time in seconds (used for lyric sync when audioRef is unavailable). */
    virtualTimeRef: React.RefObject<number>;
}

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
    vocalsRef,
    videoRef,
    scoreDisplayRef,
    progressLineRef,
    isPlayingRef,
    parsedSong,
    bpmMultiplier,
    trackScoreWeights,
    goldenNoteMultiplier,
    devPitchOverride,
    isPassive,
    passiveState,
    isClient,
    _duration,
    onPlaybackUpdate,
    setScores,
    virtualTimeRef
}: UseScoringEngineProps) {
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const lastScoreUpdateRef = useRef<number>(0);
    const updateLoopRef = useRef<(() => void) | undefined>(undefined);

    const processPlayer = useCallback((
        player: PlayerRuntime,
        devOverride: number | null,
        deltaTimeMs: number
    ) => {
        let pitch: PitchResult | null = null;
        if (devOverride !== null) {
            pitch = {
                frequency: 440 * Math.pow(2, (devOverride - 69) / 12),
                note: devOverride,
                volume: 1.0
            };
        } else if (player.config.deviceId === 'BOT') {
            if (audioRef.current && isPlayingRef.current && parsedSong) {
                const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
                const latency = player.config.latency || 0;
                const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

                const tIdx = player.trackIndex;
                const notesSource = (parsedSong.tracks && parsedSong.tracks.length > 0 && parsedSong.tracks[tIdx])
                    ? ((parsedSong.tracks[tIdx].notes ?? []) as any[])
                    : (tIdx === 0 ? (parsedSong.notes || []) : []);

                if (notesSource) {
                    const activeNote = notesSource.find((n: any) =>
                        n.type !== '-' && n.type !== 'R' && n.type !== 'G' &&
                        currentBeat >= n.start &&
                        currentBeat <= n.start + n.duration
                    );

                    if (activeNote) {
                        pitch = {
                            frequency: 440 * Math.pow(2, (activeNote.pitch - 69) / 12),
                            note: activeNote.pitch,
                            volume: 0.8
                        };
                    }
                }
            }
        } else {
            pitch = devOverride !== null ? { frequency: 440, note: devOverride, volume: 0.5 } : player.getPitch();
        }

        if (!isPlayingRef.current) {
            pitch = null;
        }

        player.pitchRef.current = pitch;

        if (pitch && pitch.note > 0 && isPlayingRef.current && parsedSong && parsedSong.notes && audioRef.current) {
            const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
            const latency = player.config.latency || 0;
            const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

            const tIdx = player.trackIndex;
            const notesSource: any[] = (parsedSong.tracks && parsedSong.tracks.length > 0 && parsedSong.tracks[tIdx])
                ? parsedSong.tracks[tIdx].notes
                : (tIdx === 0 ? parsedSong.notes : []);

            if (!notesSource || notesSource.length === 0) return;

            const currentScoreWeight = (trackScoreWeights.length > tIdx) ? trackScoreWeights[tIdx] : (trackScoreWeights[0] || 0);

            const activeNoteIndex = notesSource.findIndex((n) =>
                n.type !== '-' && n.type !== 'R' && n.type !== 'G' &&
                currentBeat >= n.start &&
                currentBeat <= n.start + n.duration
            );

            if (activeNoteIndex !== -1) {
                const note = notesSource[activeNoteIndex];
                const targetPitch = note.pitch;
                const sungPitch = pitch.note;

                const diff = Math.abs((sungPitch % 12) - (targetPitch % 12));
                const semitoneDiff = Math.min(diff, 12 - diff);

                if (semitoneDiff < 1.0) {
                    const durationUnitsCovered = deltaTimeMs / beatDuration;
                    let points = durationUnitsCovered * currentScoreWeight;
                    if (note.type === '*') points *= goldenNoteMultiplier;

                    if (!player.trackScores[tIdx]) player.trackScores[tIdx] = 0;
                    player.trackScores[tIdx] += points;

                    const activeSegment = player.activeSegments[tIdx];
                    const wasHitting = activeSegment ? activeSegment.noteIndex === activeNoteIndex : false;

                    if (!wasHitting) {
                        player.combo += 1;
                        if (player.combo > player.maxCombo) player.maxCombo = player.combo;

                        let rating: RatingType = 'Good';
                        if (semitoneDiff < 0.2) rating = 'Perfect';
                        else if (semitoneDiff < 0.5) rating = 'Good';
                        else rating = 'Okay';

                        const hitScore = Math.round(player.trackScores[tIdx] || 0);

                        player.lastHit = {
                            rating,
                            score: hitScore,
                            timestamp: Date.now()
                        };

                        scoreDisplayRef.current?.triggerHit(
                            player.config.id,
                            rating,
                            player.combo,
                            hitScore
                        );
                    } else {
                        if (Math.random() < 0.1) {
                            scoreDisplayRef.current?.triggerHit(
                                player.config.id,
                                'Good',
                                player.combo,
                                Math.round(player.trackScores[tIdx])
                            );
                        }
                    }

                    const record = player.segmentsRef.current;
                    if (!record) return;

                    const activeSeg = player.activeSegments[tIdx];

                    if (activeSeg &&
                        activeSeg.trackIndex === tIdx &&
                        activeSeg.noteIndex === activeNoteIndex) {
                        activeSeg.endBeat = currentBeat;
                    } else {
                        const newSegment = {
                            noteIndex: activeNoteIndex,
                            startBeat: currentBeat,
                            endBeat: currentBeat,
                            trackIndex: tIdx
                        };
                        player.activeSegments[tIdx] = newSegment;

                        if (!record[activeNoteIndex]) record[activeNoteIndex] = [];
                        record[activeNoteIndex].push(newSegment);
                    }
                } else {
                    if (player.activeSegments[tIdx] !== null) {
                        player.combo = 0;
                        const hitScore = Math.round(player.trackScores[tIdx] || 0);
                        player.lastHit = {
                            rating: 'Miss',
                            score: hitScore,
                            timestamp: Date.now()
                        };

                        scoreDisplayRef.current?.triggerHit(
                            player.config.id,
                            'Miss',
                            0,
                            hitScore
                        );
                    }
                    player.activeSegments[tIdx] = null;
                }
            } else {
                if (player.activeSegments[tIdx] !== null) {
                    player.activeSegments[tIdx] = null;
                }
            }
        }
    }, [audioRef, isPlayingRef, parsedSong, bpmMultiplier, trackScoreWeights, goldenNoteMultiplier, scoreDisplayRef]);

    const updateLoop = useCallback(() => {
        const now = performance.now();
        let deltaTime = now - lastTimeRef.current;
        if (deltaTime > 100) deltaTime = 100; // Cap to 100ms to prevent massive jumps when tab is backgrounded
        lastTimeRef.current = now;

        const duration = (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
            ? audioRef.current.duration
            : (_duration > 0 ? _duration : 0);

        let currentTime = (isPassive && isClient) ? virtualTimeRef.current! : (audioRef.current ? audioRef.current.currentTime : 0);

        // Interpolate time for fully passive clients
        if (isPassive && isClient && isPlayingRef.current) {
            currentTime += (deltaTime / 1000);
            (virtualTimeRef as any).current = currentTime;
        }

        if (onPlaybackUpdate) {
            onPlaybackUpdate({
                isPlaying: isPassive ? isPlayingRef.current : !audioRef.current?.paused,
                currentTime,
                duration,
                progress: duration > 0 ? (currentTime / duration) * 100 : 0
            });
        }

        if (audioRef.current) {
            const currentAudioTime = audioRef.current.currentTime;
            
            if (videoRef.current) {
                const diff = currentAudioTime - videoRef.current.currentTime;
                if (Math.abs(diff) > 0.3) {
                    videoRef.current.currentTime = currentAudioTime;
                } else if (diff > 0.05) {
                    videoRef.current.playbackRate = 1.05;
                } else if (diff < -0.05) {
                    videoRef.current.playbackRate = 0.95;
                } else {
                    videoRef.current.playbackRate = 1.0;
                }
            }
            if (vocalsRef.current) {
                if (Math.abs(currentAudioTime - vocalsRef.current.currentTime) > 0.25) {
                    vocalsRef.current.currentTime = currentAudioTime;
                }
                
                if (isPlayingRef.current && !audioRef.current.paused && vocalsRef.current.paused) {
                    vocalsRef.current.play().catch(e => console.warn("Vocals sync play failed", e));
                } else if ((!isPlayingRef.current || audioRef.current.paused) && !vocalsRef.current.paused) {
                    vocalsRef.current.pause();
                }
            }
        }

        if (progressLineRef.current) {
            if (duration > 0) {
                const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
                progressLineRef.current.style.width = `${progress}%`;
            }
        }

        if (isPassive) {
            requestRef.current = requestAnimationFrame(() => updateLoopRef.current?.());
            return;
        }

        players.forEach((player, index) => {
            const override = (index === 0) ? devPitchOverride : null;
            processPlayer(player, override, deltaTime);
        });

        if (now - lastScoreUpdateRef.current > 200) {
            const newScores: Record<string, number> = {};
            players.forEach(p => {
                const currentTrackScore = p.trackScores[p.trackIndex] || 0;
                newScores[p.config.id] = Math.round(currentTrackScore);
            });
            setScores?.(newScores);
            lastScoreUpdateRef.current = now;
        }

        requestRef.current = requestAnimationFrame(() => updateLoopRef.current?.());
    }, [
        audioRef, videoRef, vocalsRef,
        isPassive, isClient, isPlayingRef,
        _duration, onPlaybackUpdate, passiveState,
        progressLineRef, players, devPitchOverride, processPlayer, setScores
    ]);

    useEffect(() => {
        updateLoopRef.current = updateLoop;
    }, [updateLoop]);

    useEffect(() => {
        lastTimeRef.current = performance.now();
        if (!ready) return;

        if (!isPassive && players.length > 0) {
            players.forEach(p => {
                p.start().catch(e => console.error(`Failed to start mic for ${p.config.name}`, e));
            });
        } else {
            console.log("[MelodiqSession] No players active (or passive mode), starting loop for playback/visuals only.");
        }

        requestRef.current = requestAnimationFrame(() => updateLoopRef.current?.());

        return () => {
            cancelAnimationFrame(requestRef.current);
            players.forEach(p => p.stop());
        };
    }, [ready, players, isPassive, updateLoop]);
}
