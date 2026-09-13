import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import {
    getYouTubeVideoId,
    ensureYouTubeIframeApi,
    type YTPlayerInstance,
} from './youtubeApi';

export { getYouTubeVideoId };

interface YouTubeBackgroundPlayerProps {
    videoId: string;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    initialTime?: number;
    onError?: (error: unknown) => void;
}

interface YTPlayerEvent {
    target: YTPlayerInstance;
    data: unknown;
}

export const YouTubeBackgroundPlayer: React.FC<YouTubeBackgroundPlayerProps> = ({
    videoId,
    videoRef,
    initialTime = 0,
    onError,
}) => {
    const containerIdRef = useRef(`yt-bg-player-${Math.random().toString(36).slice(2, 9)}`);
    const containerId = containerIdRef.current;
    const playerRef = useRef<YTPlayerInstance | null>(null);

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

        const adapter = {
            src: `https://www.youtube.com/watch?v=${videoId}`,
            error: null,
            get currentTime() {
                if (isReady && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    try {
                        const t = playerRef.current.getCurrentTime();
                        if (typeof t === 'number' && !isNaN(t)) {
                            lastKnownTime = t;
                        }
                    } catch {
                        // ignore API read errors
                    }
                }
                return lastKnownTime;
            },
            set currentTime(t: number) {
                lastKnownTime = t;
                const now = performance.now();
                if (isReady && playerRef.current && typeof playerRef.current.seekTo === 'function') {
                    if (now - lastSeekTimestamp > 1000) {
                        try {
                            const cur = playerRef.current.getCurrentTime() || 0;
                            if (Math.abs(cur - t) > 0.5) {
                                lastSeekTimestamp = now;
                                playerRef.current.seekTo(t, true);
                            }
                        } catch {
                            // ignore API seek errors
                        }
                    }
                } else {
                    pendingSeek = t;
                }
            },
            get playbackRate() {
                if (isReady && playerRef.current && typeof playerRef.current.getPlaybackRate === 'function') {
                    try {
                        return playerRef.current.getPlaybackRate() || 1.0;
                    } catch {
                        // ignore API read errors
                    }
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
                    } catch {
                        // ignore API errors
                    }
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
                    } catch {
                        // ignore API read errors
                    }
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
                    } catch {
                        // ignore API errors
                    }
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
                    } catch {
                        // ignore API errors
                    }
                }
            },
            muted: true,
            seeking: false,
            ended: false,
            addEventListener: () => {},
            removeEventListener: () => {},
        };

        (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = adapter as unknown as HTMLVideoElement;

        ensureYouTubeIframeApi().then(() => {
            if (!isMounted) return;

            const container = document.getElementById(containerId);
            if (!container) return;

            try {
                const win = window as unknown as {
                    YT: {
                        Player: new (
                            id: string,
                            config: {
                                videoId: string;
                                host: string;
                                playerVars: Record<string, unknown>;
                                events: {
                                    onReady: (event: YTPlayerEvent) => void;
                                    onError: (event: YTPlayerEvent) => void;
                                };
                            }
                        ) => YTPlayerInstance;
                    };
                };

                playerRef.current = new win.YT.Player(containerId, {
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
                        origin: window.location.origin,
                    },
                    events: {
                        onReady: (event: YTPlayerEvent) => {
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
                            } catch {
                                // ignore initialization errors
                            }
                        },
                        onError: (event: YTPlayerEvent) => {
                            console.warn('[YouTubeBackgroundPlayer] YouTube Player error:', event.data);
                            onErrorRef.current?.(event.data);
                        },
                    },
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
            } catch {
                // ignore destroy error
            }
            playerRef.current = null;
            if ((videoRef as React.MutableRefObject<unknown>).current === adapter) {
                (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = null;
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
                pointerEvents: 'none',
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
                    pointerEvents: 'none',
                }}
            />
        </Box>
    );
};
