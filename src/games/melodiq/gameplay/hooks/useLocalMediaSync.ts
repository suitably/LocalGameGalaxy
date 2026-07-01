import { useEffect, useRef } from 'react';

interface UseLocalMediaSyncProps {
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    vocalsRef: React.RefObject<HTMLAudioElement | null>;
    isPlaying: boolean;
}

const SYNC_THRESHOLD = 0.25; // seconds

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

                    const drift = Math.abs(video.currentTime - masterTime);
                    if (drift > SYNC_THRESHOLD && video.readyState > 0 && !audio.paused) {
                        video.currentTime = masterTime;
                    }
                }

                // Sync Vocals
                if (vocals) {
                    if (audio.readyState < 3 && !vocals.paused) {
                        vocals.pause();
                    } else if (audio.readyState >= 3 && vocals.paused && !audio.paused) {
                        vocals.play().catch(() => {});
                    }

                    const drift = Math.abs(vocals.currentTime - masterTime);
                    if (drift > SYNC_THRESHOLD && vocals.readyState > 0 && !audio.paused) {
                        vocals.currentTime = masterTime;
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
