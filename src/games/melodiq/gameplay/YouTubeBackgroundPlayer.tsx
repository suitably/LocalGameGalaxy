import React, { useEffect, useRef, useState, useId } from 'react';
import { Box } from '@mui/material';
import {
    getYouTubeVideoId,
    ensureYouTubeIframeApi,
    type YTPlayerInstance,
} from './youtubeApi';
import { createYouTubeVideoAdapter } from './createYouTubeVideoAdapter';

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
    const id = useId();
    const containerId = `yt-bg-player-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const [isPlayerVisible, setIsPlayerVisible] = useState(false);

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const initialTimeRef = useRef(initialTime);
    initialTimeRef.current = initialTime;

    useEffect(() => {
        let isMounted = true;
        let isReady = false;

        const adapter = createYouTubeVideoAdapter({
            videoId,
            getPlayer: () => playerRef.current,
            isPlayerReady: () => isReady,
            initialTime: initialTimeRef.current,
            driftToleranceSec: 1.8,
            seekCooldownMs: 3000,
        });

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
                                    onStateChange?: (event: YTPlayerEvent) => void;
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
                                const pendingSeek = adapter.getPendingSeek();
                                if (pendingSeek !== null) {
                                    event.target.seekTo(pendingSeek, true);
                                    adapter.clearPendingSeek();
                                }
                                if (adapter.getPendingPlay()) {
                                    event.target.playVideo();
                                } else {
                                    event.target.pauseVideo();
                                }
                            } catch {
                                // ignore initialization errors
                            }
                        },
                        onStateChange: (event: YTPlayerEvent) => {
                            // Fade in player only once actively playing to prevent paused thumbnail / play icon flash
                            if (event.data === 1 && isMounted) {
                                setIsPlayerVisible(true);
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
            if ((videoRef as React.MutableRefObject<unknown>).current === (adapter as unknown as HTMLVideoElement)) {
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
                opacity: isPlayerVisible ? 1 : 0,
                transition: 'opacity 0.4s ease-in-out',
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
