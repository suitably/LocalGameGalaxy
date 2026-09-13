import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { type PassiveGameState } from '../../types';
import { type SongWithNotes } from '../PitchVisualizer';
import { usePlaybackControls } from './usePlaybackControls';
import { useLocalMediaSync } from './useLocalMediaSync';
import { useWakeLock } from '../../../../hooks/useWakeLock';

export interface UseSessionAudioControllerOptions {
    songId: string;
    audioSrc?: string | null;
    vocalsSrc?: string | null;
    videoSrc?: string | null;
    initialTime?: number;
    muteAudio?: boolean;
    songVolume: number;
    masterVolume: number;
    vocalsVolume?: number;
    audioPlaybackMode?: string;
    isPassive?: boolean;
    passiveState?: PassiveGameState | null;
    isClient?: boolean;
    ready: boolean;
    contentLoading: boolean;
    parsedSong: SongWithNotes | null;
    onExit: (forceHome?: boolean) => void;
    onPlaybackUpdate?: (state: { isPlaying: boolean; currentTime: number; duration: number; progress: number }) => void;
}

export function useSessionAudioController({
    songId,
    audioSrc,
    vocalsSrc,
    initialTime,
    muteAudio = false,
    songVolume,
    masterVolume,
    vocalsVolume = 1.0,
    audioPlaybackMode,
    isPassive = false,
    passiveState,
    isClient = false,
    ready,
    contentLoading,
    parsedSong,
    onExit,
    onPlaybackUpdate
}: UseSessionAudioControllerOptions) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isPausedForScore, setIsPausedForScore] = useState(false);
    const [duration, setDuration] = useState(0);
    const [passivePlayBlocked, setPassivePlayBlocked] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const vocalsRef = useRef<HTMLAudioElement>(null);
    const virtualTimeRef = useRef<number>(0);

    const isPlayingRef = useRef(isPlaying);
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useWakeLock(isPlaying && !isFinished);

    // Track playback position to restore on mode/source changes
    const lastPlaybackPosRef = useRef<number>(0);
    const wasPlayingBeforeSwitchRef = useRef<boolean>(false);
    const pendingModeSwitchResumeRef = useRef<{ time: number; shouldPlay: boolean } | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const updatePos = () => {
            if (audio.currentTime > 0) {
                lastPlaybackPosRef.current = audio.currentTime;
                wasPlayingBeforeSwitchRef.current = isPlaying || (!audio.paused && !audio.ended);
            }
        };
        audio.addEventListener('timeupdate', updatePos);
        return () => audio.removeEventListener('timeupdate', updatePos);
    }, [isPlaying]);

    // Snapshot state when audioPlaybackMode changes
    const prevModeRef = useRef(audioPlaybackMode);
    useEffect(() => {
        if (prevModeRef.current !== audioPlaybackMode) {
            prevModeRef.current = audioPlaybackMode;
            if (lastPlaybackPosRef.current > 0) {
                pendingModeSwitchResumeRef.current = {
                    time: lastPlaybackPosRef.current,
                    shouldPlay: wasPlayingBeforeSwitchRef.current || isPlaying
                };
            }
        }
    }, [audioPlaybackMode, isPlaying]);

    const {
        togglePlay,
        pauseForScore,
        resumeFromScore,
        handleNext,
        safePlay,
    } = usePlaybackControls({
        audioRef,
        vocalsRef,
        videoRef,
        isPlaying,
        setIsPlaying,
        isFinished,
        isPausedForScore,
        setIsPausedForScore,
        muteAudio,
        songVolume,
        masterVolume,
        vocalsVolume
    });

    // Seamless audio mode & source switch resume
    const prevAudioSrcRef = useRef(audioSrc);
    const prevVocalsSrcRef = useRef(vocalsSrc);
    useEffect(() => {
        const srcChanged = prevAudioSrcRef.current !== audioSrc;
        const vocalsChanged = prevVocalsSrcRef.current !== vocalsSrc;
        prevAudioSrcRef.current = audioSrc;
        prevVocalsSrcRef.current = vocalsSrc;

        if (!srcChanged && !vocalsChanged) return;

        const resumeInfo = pendingModeSwitchResumeRef.current;
        const resumeTime = resumeInfo ? resumeInfo.time : (lastPlaybackPosRef.current > 0 ? lastPlaybackPosRef.current : null);
        const shouldPlay = resumeInfo ? resumeInfo.shouldPlay : isPlaying;

        if (resumeTime !== null && resumeTime > 0) {
            const resumePlayback = async () => {
                const audio = audioRef.current;
                const vocals = vocalsRef.current;

                if (srcChanged && audio) {
                    if (audio.readyState < 2) {
                        await new Promise<void>(res => {
                            const onCanPlay = () => {
                                audio.removeEventListener('canplay', onCanPlay);
                                res();
                            };
                            audio.addEventListener('canplay', onCanPlay, { once: true });
                            setTimeout(res, 800);
                        });
                    }
                    audio.currentTime = resumeTime;
                    if (videoRef.current) {
                        videoRef.current.currentTime = resumeTime;
                    }
                }

                if (vocals) {
                    if (vocals.readyState < 2) {
                        await new Promise<void>(res => {
                            const onCanPlay = () => {
                                vocals.removeEventListener('canplay', onCanPlay);
                                res();
                            };
                            vocals.addEventListener('canplay', onCanPlay, { once: true });
                            setTimeout(res, 800);
                        });
                    }
                    const targetVocalsTime = Math.max(0, audio ? audio.currentTime : resumeTime);
                    vocals.currentTime = targetVocalsTime;
                }

                pendingModeSwitchResumeRef.current = null;

                if (shouldPlay) {
                    try {
                        await safePlay();
                    } catch (e) {
                        console.warn('[Session] Resume after audio mode switch failed:', e);
                    }
                }
            };

            resumePlayback();
        }
    }, [audioSrc, vocalsSrc, safePlay, isPlaying]);

    useLocalMediaSync({ audioRef, videoRef, vocalsRef, isPlaying });

    // Audio metadata duration
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audioSrc) {
            audio.onloadedmetadata = () => setDuration(audio.duration);
        }
    }, [audioSrc]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
            if (vocalsRef.current) vocalsRef.current.pause();
            if (videoRef.current) videoRef.current.pause();
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
                return;
            }

            switch (e.key) {
                case ' ':
                case 'MediaPlayPause':
                    e.preventDefault();
                    e.stopPropagation();
                    (document.activeElement as HTMLElement)?.blur();
                    if (isFinished || isPausedForScore) {
                        onExit(false);
                    } else {
                        togglePlay();
                    }
                    break;
                case 'ArrowRight':
                case 'MediaFastForward':
                    if (audioRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        const newTime = Math.min(audioRef.current.duration || Infinity, audioRef.current.currentTime + 10);
                        audioRef.current.currentTime = newTime;
                        if (vocalsRef.current) vocalsRef.current.currentTime = newTime;
                        if (videoRef.current) videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'ArrowLeft':
                case 'MediaRewind':
                    if (audioRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        const newTime = Math.max(0, audioRef.current.currentTime - 10);
                        audioRef.current.currentTime = newTime;
                        if (vocalsRef.current) vocalsRef.current.currentTime = newTime;
                        if (videoRef.current) videoRef.current.currentTime = newTime;
                    }
                    break;
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    e.stopPropagation();
                    onExit();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [togglePlay, onExit, isFinished, isPausedForScore]);

    // Autostart logic
    const hasStartedRef = useRef(false);
    useEffect(() => {
        hasStartedRef.current = false;
    }, [songId]);

    useEffect(() => {
        if (!hasStartedRef.current && !isPassive && ready && !contentLoading && parsedSong && audioSrc && audioRef.current && !isFinished) {
            hasStartedRef.current = true;
            const startPlayback = async () => {
                const targetAudio = audioRef.current;
                if (!targetAudio) return;

                const waitForCanPlay = (el: HTMLMediaElement) => {
                    if (el.readyState >= 2) return Promise.resolve();
                    return new Promise<void>(resolve => {
                        const handler = () => {
                            el.removeEventListener('canplay', handler);
                            resolve();
                        };
                        el.addEventListener('canplay', handler, { once: true });
                        setTimeout(resolve, 1500);
                    });
                };

                await waitForCanPlay(targetAudio);
                if (vocalsRef.current) {
                    await waitForCanPlay(vocalsRef.current);
                }

                const startTime = (initialTime && initialTime > 0) ? initialTime : 0;
                targetAudio.currentTime = startTime;
                if (videoRef.current) videoRef.current.currentTime = startTime;
                if (vocalsRef.current) vocalsRef.current.currentTime = startTime;

                try {
                    await safePlay();
                } catch (e) {
                    console.warn('[Session] Autostart playback deferred:', e);
                }
            };
            startPlayback();
        }
    }, [ready, contentLoading, parsedSong, audioSrc, songId, isFinished, safePlay, initialTime, isPassive]);

    // Dynamic volume sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muteAudio ? 0 : (songVolume * masterVolume);
        }
        if (vocalsRef.current) {
            vocalsRef.current.volume = muteAudio ? 0 : (vocalsVolume * masterVolume);
        }

        const handleDirectVolume = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            const effectiveMaster = detail.masterVolume !== undefined ? detail.masterVolume : masterVolume;
            const effectiveSong = detail.songVolume !== undefined ? detail.songVolume : songVolume;
            const effectiveVocals = detail.vocalsVolume !== undefined ? detail.vocalsVolume : vocalsVolume;

            if (audioRef.current && (detail.songVolume !== undefined || detail.masterVolume !== undefined)) {
                audioRef.current.volume = muteAudio ? 0 : Math.max(0, Math.min(1, effectiveSong * effectiveMaster));
            }
            if (vocalsRef.current && (detail.vocalsVolume !== undefined || detail.masterVolume !== undefined)) {
                vocalsRef.current.volume = muteAudio ? 0 : Math.max(0, Math.min(1, effectiveVocals * effectiveMaster));
            }
        };

        window.addEventListener('melodiq_direct_volume', handleDirectVolume);
        return () => window.removeEventListener('melodiq_direct_volume', handleDirectVolume);
    }, [muteAudio, songVolume, masterVolume, vocalsVolume]);

    // Playback state update notifications
    const onPlaybackUpdateRef = useRef(onPlaybackUpdate);
    useEffect(() => {
        onPlaybackUpdateRef.current = onPlaybackUpdate;
    });

    useEffect(() => {
        if (onPlaybackUpdateRef.current) {
            onPlaybackUpdateRef.current({
                isPlaying: isPassive && passiveState ? passiveState.isPlaying : isPlaying,
                currentTime: audioRef.current?.currentTime || 0,
                duration: audioRef.current?.duration || 0,
                progress: audioRef.current?.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0
            });
        }
    }, [isPlaying, isPassive, passiveState?.isPlaying]);

    // Unblock passive playback
    const handlePassiveUnblock = useCallback(async () => {
        try {
            if (audioRef.current && passiveState?.currentTime) {
                audioRef.current.currentTime = passiveState.currentTime;
                if (vocalsRef.current) vocalsRef.current.currentTime = passiveState.currentTime;
                if (videoRef.current) videoRef.current.currentTime = passiveState.currentTime;
            }
            const playPromises: Promise<void>[] = [];
            if (audioRef.current) playPromises.push(audioRef.current.play());
            if (vocalsRef.current) playPromises.push(vocalsRef.current.play().catch(() => {}));
            if (videoRef.current) playPromises.push(videoRef.current.play().catch(() => {}));
            await Promise.all(playPromises);
            setIsPlaying(true);
            setPassivePlayBlocked(false);
        } catch (e) {
            console.warn('[Session] Failed to unblock passive audio:', e);
        }
    }, [passiveState?.currentTime]);

    const timeProxyRef = useMemo(() => ({
        current: {
            get currentTime() { return isClient ? virtualTimeRef.current : (audioRef.current?.currentTime || 0); },
            get paused() { return !isPlayingRef.current; },
            get isFinished() { return isFinished; },
            get ended() { return isFinished; },
            get readyState() { return isClient ? 4 : (audioRef.current?.readyState || 0); }
        }
    }), [isClient, isFinished]);

    return {
        audioRef,
        vocalsRef,
        videoRef,
        virtualTimeRef,
        isPlaying,
        setIsPlaying,
        isFinished,
        setIsFinished,
        isPausedForScore,
        setIsPausedForScore,
        duration,
        passivePlayBlocked,
        setPassivePlayBlocked,
        isPlayingRef,
        togglePlay,
        pauseForScore,
        resumeFromScore,
        handleNext,
        safePlay,
        timeProxyRef,
        handlePassiveUnblock
    };
}
