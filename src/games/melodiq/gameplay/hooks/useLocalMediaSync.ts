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
                vocals.currentTime = audio.currentTime;
            }
        };

        const handleRateChange = () => {
            if (vocals && vocals.playbackRate !== audio.playbackRate) {
                vocals.playbackRate = audio.playbackRate;
            }
        };

        audio.addEventListener('seeking', handleAudioSeeking);
        audio.addEventListener('ratechange', handleRateChange);

        return () => {
            audio.removeEventListener('seeking', handleAudioSeeking);
            audio.removeEventListener('ratechange', handleRateChange);
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

                // Sync Vocals Play/Pause & Precision Audio Timing
                if (vocals) {
                    if (isAudioPlaying && vocals.paused && vocals.readyState >= 2) {
                        // Align currentTime before starting to guarantee zero initial desync
                        vocals.currentTime = masterTime;
                        vocals.play().catch(() => {});
                    } else if (!isAudioPlaying && !vocals.paused) {
                        vocals.pause();
                    }

                    if (vocals.readyState >= 2 && isAudioPlaying) {
                        const drift = masterTime - vocals.currentTime;
                        const absDrift = Math.abs(drift);

                        // Only re-sync if there is a massive desync (e.g. background tab freeze > 500ms).
                        // Under normal playback, native audio clocks stay in lockstep at 1.0x rate.
                        // Constantly seeking or adjusting playbackRate causes audio buffer flushes and stuttering.
                        if (absDrift > 0.5 && (now - lastSnapTimeRef.current > 1000)) {
                            vocals.currentTime = masterTime;
                            lastSnapTimeRef.current = now;
                        }

                        // Maintain identical playback rate with master audio
                        if (vocals.playbackRate !== baseRate) {
                            vocals.playbackRate = baseRate;
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
