import { useEffect, useRef } from 'react';

interface UseLocalMediaSyncProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    isPlaying: boolean;
}



export function useLocalMediaSync({ audioRef, videoRef, vocalsRef, isPlaying }: UseLocalMediaSyncProps) {
    const rAFRef = useRef<number | null>(null);

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

            if (audio) {
                const masterTime = audio.currentTime;
                const baseRate = audio.playbackRate || 1.0;
                const isAudioPlaying = !audio.paused && !audio.ended;

                // Sync Video Play/Pause & Timing
                if (video) {
                    if (isAudioPlaying && video.paused && video.readyState >= 2) {
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

                // Sync Vocals Play/Pause & Timing
                if (vocals) {
                    if (isAudioPlaying && vocals.paused && vocals.readyState >= 2) {
                        vocals.play().catch(() => {});
                    } else if (!isAudioPlaying && !vocals.paused) {
                        vocals.pause();
                    }

                    if (vocals.readyState >= 2 && isAudioPlaying) {
                        const drift = masterTime - vocals.currentTime;
                        const absDrift = Math.abs(drift);

                        if (absDrift > 0.25) {
                            vocals.currentTime = masterTime;
                            vocals.playbackRate = baseRate;
                        } else if (drift > 0.03) {
                            vocals.playbackRate = baseRate + 0.03;
                        } else if (drift < -0.03) {
                            vocals.playbackRate = baseRate - 0.03;
                        } else if (vocals.playbackRate !== baseRate) {
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
