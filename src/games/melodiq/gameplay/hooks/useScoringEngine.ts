import { useEffect, useRef, useCallback } from 'react';
import { type PlayerRuntime } from './PlayerRuntime';
import { type PitchResult } from '../../audio/MicrophoneManager';
import { type RatingType, type ScoreDisplayHandle } from '../ScoreDisplay';

interface UseScoringEngineProps {
    players: PlayerRuntime[];
    ready: boolean;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
    progressLineRef: React.RefObject<HTMLDivElement | null>;
    isPlayingRef: React.RefObject<boolean>;
    parsedSong: any;
    bpmMultiplier: number;
    trackScoreWeights: number[];
    goldenNoteMultiplier: number;
    devPitchOverride: number | null;
    isPassive: boolean;
    passiveState: any;
    isClient: boolean;
    _duration: number;
    onPlaybackUpdate?: (state: any) => void;
    setScores?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

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
    setScores
}: UseScoringEngineProps) {
    const requestRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    const lastScoreUpdateRef = useRef<number>(0);
    const virtualTimeRef = useRef<number>(0);

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
        const deltaTime = now - lastTimeRef.current;
        lastTimeRef.current = now;

        if (isPassive) {
            if (isClient && isPlayingRef.current) {
                virtualTimeRef.current += (deltaTime / 1000);
            }
            requestRef.current = requestAnimationFrame(updateLoop);
            return;
        }

        const duration = (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
            ? audioRef.current.duration
            : (_duration > 0 ? _duration : 0);

        const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

        if (onPlaybackUpdate) {
            onPlaybackUpdate({
                isPlaying: isPassive && passiveState ? passiveState.isPlaying : !audioRef.current?.paused,
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
            const dur = (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
                ? audioRef.current.duration
                : (_duration > 0 ? _duration : 0);

            if (dur > 0) {
                const audioNow = audioRef.current?.currentTime || 0;
                const progress = Math.min(100, Math.max(0, (audioNow / dur) * 100));
                progressLineRef.current.style.width = `${progress}%`;
            }
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

        requestRef.current = requestAnimationFrame(updateLoop);
    }, [
        audioRef, videoRef, vocalsRef,
        isPassive, isClient, isPlayingRef,
        _duration, onPlaybackUpdate, passiveState,
        progressLineRef, players, devPitchOverride, processPlayer, setScores
    ]);

    useEffect(() => {
        if (!ready) return;

        if (!isPassive && players.length > 0) {
            players.forEach(p => {
                p.start().catch(e => console.error(`Failed to start mic for ${p.config.name}`, e));
            });
        } else {
            console.log("[MelodiqSession] No players active (or passive mode), starting loop for playback/visuals only.");
        }

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(requestRef.current);
            players.forEach(p => p.stop());
        };
    }, [ready, players, isPassive, updateLoop]);
}
