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
            return;
        }

        const syncLoop = () => {
            const audio = audioRef.current;
            const video = videoRef.current;
            const vocals = vocalsRef.current;

            if (audio) {
                const masterTime = audio.currentTime;
                
                // Sync Video
                if (video) {
                    // Check if audio is buffering/stalled
                    if (audio.readyState < 3 && !video.paused) {
                        video.pause();
                    } else if (audio.readyState >= 3 && video.paused && !audio.paused) {
                        video.play().catch(() => {});
                    }

                    if (video.readyState > 0 && !audio.paused) {
                        const drift = masterTime - video.currentTime; // Positive if video is behind
                        const absDrift = Math.abs(drift);
                        const baseRate = audio.playbackRate;

                        if (absDrift > 2.0) {
                            // Only hard-snap if it's massively out of sync (> 2 seconds)
                            video.currentTime = masterTime;
                            video.playbackRate = baseRate;
                        } else if (drift > 0.25) {
                            // Medium lag (e.g. short buffer): fast catch-up
                            video.playbackRate = baseRate + 0.25;
                        } else if (drift < -0.25) {
                            video.playbackRate = baseRate - 0.25;
                        } else if (drift > 0.05) {
                            // Micro lag: smooth catch-up
                            video.playbackRate = baseRate + 0.05;
                        } else if (drift < -0.05) {
                            video.playbackRate = baseRate - 0.05;
                        } else {
                            // In sync
                            if (video.playbackRate !== baseRate) video.playbackRate = baseRate;
                        }
                    }
                }

                // Sync Vocals
                if (vocals) {
                    if (audio.readyState < 3 && !vocals.paused) {
                        vocals.pause();
                    } else if (audio.readyState >= 3 && vocals.paused && !audio.paused) {
                        vocals.play().catch(() => {});
                    }

                    if (vocals.readyState > 0 && !audio.paused) {
                        const drift = masterTime - vocals.currentTime;
                        const absDrift = Math.abs(drift);
                        const baseRate = audio.playbackRate;

                        if (absDrift > 2.0) {
                            vocals.currentTime = masterTime;
                            vocals.playbackRate = baseRate;
                        } else if (drift > 0.25) {
                            vocals.playbackRate = baseRate + 0.25;
                        } else if (drift < -0.25) {
                            vocals.playbackRate = baseRate - 0.25;
                        } else if (drift > 0.05) {
                            vocals.playbackRate = baseRate + 0.05;
                        } else if (drift < -0.05) {
                            vocals.playbackRate = baseRate - 0.05;
                        } else {
                            if (vocals.playbackRate !== baseRate) vocals.playbackRate = baseRate;
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
            }
        };
    }, [isPlaying, audioRef, videoRef, vocalsRef]);
}
