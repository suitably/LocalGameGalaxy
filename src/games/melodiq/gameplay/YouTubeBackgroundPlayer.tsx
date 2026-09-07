import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

export function getYouTubeVideoId(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    let decoded = url;
    try {
        if (url.includes('%')) {
            decoded = decodeURIComponent(url);
        }
    } catch (_) {}

    // 1. Standard YouTube URL patterns
    const urlMatch = decoded.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (urlMatch) return urlMatch[1];

    // 2. USDB metadata patterns: v=VIDEO_ID or a=VIDEO_ID (often comma-separated with co=, bg=, preview=)
    const usdbMatch = decoded.match(/(?:^|[,\s])(?:v|a)=([a-zA-Z0-9_-]{11})(?:[,\s]|$)/);
    if (usdbMatch) return usdbMatch[1];

    // 3. Raw 11-char ID
    const trimmed = decoded.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    return null;
}

interface YouTubeBackgroundPlayerProps {
    videoId: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    initialTime?: number;
    onError?: (error: any) => void;
}

// Global script loader promise to avoid duplicate injections
let ytApiPromise: Promise<void> | null = null;

function ensureYouTubeIframeApi(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if ((window as any).YT && (window as any).YT.Player) {
        return Promise.resolve();
    }
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve) => {
        const existingScript = document.getElementById('youtube-iframe-api');
        if (existingScript) {
            const interval = setInterval(() => {
                if ((window as any).YT && (window as any).YT.Player) {
                    clearInterval(interval);
                    resolve();
                }
            }, 50);
            return;
        }

        const script = document.createElement('script');
        script.id = 'youtube-iframe-api';
        script.src = 'https://www.youtube-nocookie.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);

        const prevCallback = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
            if (typeof prevCallback === 'function') prevCallback();
            resolve();
        };
    });

    return ytApiPromise;
}

export const YouTubeBackgroundPlayer: React.FC<YouTubeBackgroundPlayerProps> = ({
    videoId,
    videoRef,
    initialTime = 0,
    onError
}) => {
    // Generate container ID once per videoId mount
    const containerIdRef = useRef(`yt-bg-player-${Math.random().toString(36).slice(2, 9)}`);
    const containerId = containerIdRef.current;
    const playerRef = useRef<any>(null);

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const initialTimeRef = useRef(initialTime);
    initialTimeRef.current = initialTime;

    useEffect(() => {
        let isMounted = true;
        let isReady = false;
        let lastKnownTime = initialTimeRef.current;
        let lastSeekTimestamp = 0;
        let pendingPlay = false;
        let pendingSeek: number | null = initialTimeRef.current > 0 ? initialTimeRef.current : null;
        let isPlayingInternal = false;

        const adapter: any = {
            get currentTime() {
                if (isReady && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    try {
                        const t = playerRef.current.getCurrentTime();
                        if (typeof t === 'number' && !isNaN(t)) {
                            lastKnownTime = t;
                        }
                    } catch (_) {}
                }
                return lastKnownTime;
            },
            set currentTime(t: number) {
                lastKnownTime = t;
                const now = performance.now();
                // Only seek if drift > 0.75s and not called within the last 1000ms
                if (isReady && playerRef.current && typeof playerRef.current.seekTo === 'function') {
                    if (now - lastSeekTimestamp > 1000) {
                        try {
                            const cur = playerRef.current.getCurrentTime() || 0;
                            if (Math.abs(cur - t) > 0.75) {
                                lastSeekTimestamp = now;
                                playerRef.current.seekTo(t, true);
                            }
                        } catch (_) {}
                    }
                } else {
                    pendingSeek = t;
                }
            },
            get playbackRate() {
                if (isReady && playerRef.current && typeof playerRef.current.getPlaybackRate === 'function') {
                    try {
                        return playerRef.current.getPlaybackRate() || 1.0;
                    } catch (_) {}
                }
                return 1.0;
            },
            set playbackRate(r: number) {
                if (isReady && playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
                    try {
                        const supportedRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
                        let closest = 1;
                        let minDiff = 999;
                        for (const rate of supportedRates) {
                            const diff = Math.abs(rate - r);
                            if (diff < minDiff) {
                                minDiff = diff;
                                closest = rate;
                            }
                        }
                        playerRef.current.setPlaybackRate(closest);
                    } catch (_) {}
                }
            },
            get paused() {
                if (isReady && playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
                    try {
                        const state = playerRef.current.getPlayerState();
                        // 2: PAUSED, 0: ENDED
                        if (state === 2 || state === 0) return true;
                        // 1: PLAYING, 3: BUFFERING
                        if (state === 1 || state === 3) return false;
                    } catch (_) {}
                }
                return !isPlayingInternal;
            },
            get readyState() {
                return isReady ? 4 : 0;
            },
            play() {
                isPlayingInternal = true;
                if (isReady && playerRef.current && typeof playerRef.current.playVideo === 'function') {
                    try {
                        playerRef.current.playVideo();
                    } catch (_) {}
                } else {
                    pendingPlay = true;
                }
                return Promise.resolve();
            },
            pause() {
                isPlayingInternal = false;
                pendingPlay = false;
                if (isReady && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                    try {
                        playerRef.current.pauseVideo();
                    } catch (_) {}
                }
            },
            muted: true,
            seeking: false,
            ended: false,
            addEventListener: () => {},
            removeEventListener: () => {}
        };

        // Attach adapter to videoRef
        (videoRef as React.MutableRefObject<any>).current = adapter;

        ensureYouTubeIframeApi().then(() => {
            if (!isMounted) return;

            const container = document.getElementById(containerId);
            if (!container) return;

            try {
                playerRef.current = new (window as any).YT.Player(containerId, {
                    videoId,
                    host: 'https://www.youtube-nocookie.com',
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        modestbranding: 1,
                        rel: 0,
                        iv_load_policy: 3,
                        mute: 1,
                        playsinline: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: (event: any) => {
                            if (!isMounted) return;
                            isReady = true;
                            try {
                                event.target.mute();
                                if (typeof event.target.setVolume === 'function') {
                                    event.target.setVolume(0);
                                }
                                if (pendingSeek !== null) {
                                    event.target.seekTo(pendingSeek, true);
                                    pendingSeek = null;
                                }
                                if (pendingPlay) {
                                    event.target.playVideo();
                                } else {
                                    event.target.pauseVideo();
                                }
                            } catch (_) {}
                        },
                        onError: (event: any) => {
                            console.warn('[YouTubeBackgroundPlayer] YouTube Player error:', event.data);
                            onErrorRef.current?.(event.data);
                        }
                    }
                });
            } catch (err) {
                console.error('[YouTubeBackgroundPlayer] Failed to instantiate YT.Player:', err);
                onErrorRef.current?.(err);
            }
        });

        return () => {
            isMounted = false;
            try {
                if (playerRef.current && typeof playerRef.current.destroy === 'function') {
                    playerRef.current.destroy();
                }
            } catch (_) {}
            playerRef.current = null;
            if ((videoRef as React.MutableRefObject<any>).current === adapter) {
                (videoRef as React.MutableRefObject<any>).current = null;
            }
        };
    }, [videoId, containerId, videoRef]);

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none'
            }}
        >
            <div
                id={containerId}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100vw',
                    height: '56.25vw', // 16:9 aspect ratio
                    minHeight: '100vh',
                    minWidth: '177.78vh', // 16:9 aspect ratio
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none'
                }}
            />
        </Box>
    );
};
