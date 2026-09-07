import { useEffect, useRef } from 'react';

interface UseLocalMediaSyncProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    isPlaying: boolean;
}

export function useLocalMediaSync({ audioRef, videoRef, vocalsRef, isPlaying }: UseLocalMediaSyncProps) {
    const rAFRef = useRef<number | null>(null);
    const lastSnapTimeRef = useRef<number>(0);
    const smoothedDriftRef = useRef<number>(0);

    // Transport event synchronization
    useEffect(() => {
        const audio = audioRef.current;
        const vocals = vocalsRef.current;
        if (!audio || !vocals) return;

        // Ensure pitch preservation is always enabled on vocal stem
        (vocals as any).preservesPitch = true;
        (vocals as any).mozPreservesPitch = true;
        (vocals as any).webkitPreservesPitch = true;

        const handleAudioSeeking = () => {
            if (vocals) {
                if (Math.abs(vocals.currentTime - audio.currentTime) > 0.002) {
                    vocals.currentTime = audio.currentTime;
                }
            }
        };

        const handleRateChange = () => {
            if (vocals && !vocals.seeking) {
                vocals.playbackRate = audio.playbackRate;
            }
        };

        const handleAudioPause = () => {
            if (vocals && !vocals.paused) {
                vocals.pause();
            }
        };

        const handleAudioPlay = () => {
            if (vocals && vocals.paused && vocals.readyState >= 2) {
                vocals.currentTime = audio.currentTime;
                vocals.play().catch(() => {});
            }
        };

        audio.addEventListener('seeking', handleAudioSeeking);
        audio.addEventListener('ratechange', handleRateChange);
        audio.addEventListener('pause', handleAudioPause);
        audio.addEventListener('play', handleAudioPlay);

        return () => {
            audio.removeEventListener('seeking', handleAudioSeeking);
            audio.removeEventListener('ratechange', handleRateChange);
            audio.removeEventListener('pause', handleAudioPause);
            audio.removeEventListener('play', handleAudioPlay);
        };
    }, [audioRef, vocalsRef]);

    useEffect(() => {
        if (!isPlaying) {
            if (rAFRef.current !== null) {
                cancelAnimationFrame(rAFRef.current);
                rAFRef.current = null;
            }
            if (vocalsRef.current && !vocalsRef.current.paused) {
                vocalsRef.current.pause();
            }
            if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
            }
            smoothedDriftRef.current = 0;
            return;
        }

        const syncLoop = () => {
            const audio = audioRef.current;
            const video = videoRef.current;
            const vocals = vocalsRef.current;
            const now = performance.now();

            if (audio) {
                const masterTime = audio.currentTime;
                const baseRate = audio.playbackRate || 1.0;
                const isAudioPlaying = !audio.paused && !audio.ended;

                // Sync Video Play/Pause & Timing
                if (video) {
                    if (isAudioPlaying && video.paused && video.readyState >= 2) {
                        video.currentTime = masterTime;
                        video.play().catch(() => {});
                    } else if (!isAudioPlaying && !video.paused) {
                        video.pause();
                    }

                    if (video.readyState >= 2 && isAudioPlaying) {
                        const drift = masterTime - video.currentTime;
                        const absDrift = Math.abs(drift);

                        if (absDrift > 0.5) {
                            video.currentTime = masterTime;
                            video.playbackRate = baseRate;
                        } else if (drift > 0.05) {
                            video.playbackRate = baseRate + 0.05;
                        } else if (drift < -0.05) {
                            video.playbackRate = baseRate - 0.05;
                        } else if (video.playbackRate !== baseRate) {
                            video.playbackRate = baseRate;
                        }
                    }
                }

                // Sync Vocals Play/Pause & Precision Fluid Audio Timing
                if (vocals) {
                    const targetVocalsTime = masterTime;

                    if (isAudioPlaying && vocals.paused && vocals.readyState >= 2) {
                        vocals.currentTime = targetVocalsTime;
                        vocals.play().catch(() => {});
                    } else if (!isAudioPlaying && !vocals.paused) {
                        vocals.pause();
                    }

                    if (vocals.readyState >= 2 && isAudioPlaying && !vocals.seeking) {
                        const rawDrift = targetVocalsTime - vocals.currentTime;
                        const absRawDrift = Math.abs(rawDrift);

                        // Hard Snap: ONLY for severe desync (> 150ms, e.g. tab backgrounded or stalled)
                        if (absRawDrift > 0.15 && (now - lastSnapTimeRef.current > 1200)) {
                            vocals.currentTime = targetVocalsTime;
                            lastSnapTimeRef.current = now;
                            smoothedDriftRef.current = 0;
                            if (vocals.playbackRate !== baseRate) {
                                vocals.playbackRate = baseRate;
                            }
                        } else if (absRawDrift < 0.15) {
                            // Exponential moving average filters out Chromium main-thread currentTime IPC jitter
                            smoothedDriftRef.current = smoothedDriftRef.current * 0.85 + rawDrift * 0.15;
                            const absSmoothed = Math.abs(smoothedDriftRef.current);

                            // Only nudge rate if smoothed drift persistently exceeds 20ms.
                            // Uses a very gentle ±0.5% rate shift (inaudible, no time-stretcher smearing).
                            if (absSmoothed > 0.020) {
                                const targetRate = smoothedDriftRef.current > 0 ? baseRate + 0.005 : baseRate - 0.005;
                                if (vocals.playbackRate !== targetRate) {
                                    vocals.playbackRate = targetRate;
                                }
                            } else if (absSmoothed < 0.004 && vocals.playbackRate !== baseRate) {
                                vocals.playbackRate = baseRate;
                            }
                        }
                    }
                }
            }

            rAFRef.current = requestAnimationFrame(syncLoop);
        };

        rAFRef.current = requestAnimationFrame(syncLoop);

        return () => {
            if (rAFRef.current !== null) {
                cancelAnimationFrame(rAFRef.current);
                rAFRef.current = null;
            }
        };
    }, [isPlaying, audioRef, videoRef, vocalsRef]);
}
