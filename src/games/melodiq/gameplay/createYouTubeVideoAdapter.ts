import type { YTPlayerInstance } from './youtubeApi';

export interface YouTubeVideoAdapterOptions {
    videoId: string;
    getPlayer: () => YTPlayerInstance | null;
    isPlayerReady: () => boolean;
    initialTime?: number;
    /** Desync threshold in seconds before seekTo is invoked. Default: 1.8s */
    driftToleranceSec?: number;
    /** Minimum milliseconds between seekTo calls. Default: 3000ms */
    seekCooldownMs?: number;
}

export interface YouTubeVideoAdapter {
    src: string;
    error: null;
    currentTime: number;
    playbackRate: number;
    paused: boolean;
    readyState: number;
    muted: boolean;
    seeking: boolean;
    ended: boolean;
    play: () => Promise<void>;
    pause: () => void;
    addEventListener: () => void;
    removeEventListener: () => void;
    getPendingPlay: () => boolean;
    getPendingSeek: () => number | null;
    clearPendingSeek: () => void;
}

/**
 * Creates an HTMLVideoElement-compatible adapter around a YouTube IFrame Player instance.
 *
 * Employs softer drift tolerance (1.8s) and seek rate-limiting (3000ms cooldown)
 * along with play/pause deduplication to avoid triggering YouTube's animated
 * play/pause bezel icon during background video playback.
 */
export function createYouTubeVideoAdapter({
    videoId,
    getPlayer,
    isPlayerReady,
    initialTime = 0,
    driftToleranceSec = 1.8,
    seekCooldownMs = 3000,
}: YouTubeVideoAdapterOptions): YouTubeVideoAdapter {
    let lastKnownTime = initialTime;
    let lastSeekTimestamp = -seekCooldownMs;
    let pendingPlay = false;
    let pendingSeek: number | null = initialTime > 0 ? initialTime : null;
    let isPlayingInternal = false;

    const adapter: YouTubeVideoAdapter = {
        src: `https://www.youtube.com/watch?v=${videoId}`,
        error: null,
        get currentTime() {
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.getCurrentTime === 'function') {
                try {
                    const t = player.getCurrentTime();
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
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.seekTo === 'function') {
                // Softer drift tolerance: only seek if desync exceeds tolerance and cooldown has elapsed
                if (now - lastSeekTimestamp > seekCooldownMs) {
                    try {
                        const cur = player.getCurrentTime() || 0;
                        if (Math.abs(cur - t) > driftToleranceSec) {
                            lastSeekTimestamp = now;
                            player.seekTo(t, true);
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
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.getPlaybackRate === 'function') {
                try {
                    return player.getPlaybackRate() || 1.0;
                } catch {
                    // ignore API read errors
                }
            }
            return 1.0;
        },
        set playbackRate(r: number) {
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.setPlaybackRate === 'function') {
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
                    player.setPlaybackRate(closest);
                } catch {
                    // ignore API errors
                }
            }
        },
        get paused() {
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.getPlayerState === 'function') {
                try {
                    const state = player.getPlayerState();
                    // 1: PLAYING, 3: BUFFERING -> Definitely NOT paused
                    if (state === 1 || state === 3) return false;
                    // 2: PAUSED, 0: ENDED -> Definitely paused
                    if (state === 2 || state === 0) return true;
                } catch {
                    // ignore API read errors
                }
            }
            return !isPlayingInternal;
        },
        get readyState() {
            return isPlayerReady() ? 4 : 0;
        },
        play() {
            const wasPlaying = isPlayingInternal;
            isPlayingInternal = true;
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.playVideo === 'function') {
                try {
                    const state = player.getPlayerState?.();
                    // Guard: only call playVideo if not already playing or buffering to prevent play icon flash
                    if (!wasPlaying || (state !== 1 && state !== 3)) {
                        player.playVideo();
                    }
                } catch {
                    // ignore API errors
                }
            } else {
                pendingPlay = true;
            }
            return Promise.resolve();
        },
        pause() {
            const wasPlaying = isPlayingInternal;
            isPlayingInternal = false;
            pendingPlay = false;
            const player = getPlayer();
            if (isPlayerReady() && player && typeof player.pauseVideo === 'function') {
                try {
                    const state = player.getPlayerState?.();
                    // Guard: only call pauseVideo if not already paused/ended
                    if (wasPlaying || (state !== 2 && state !== 0)) {
                        player.pauseVideo();
                    }
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
        getPendingPlay: () => pendingPlay,
        getPendingSeek: () => pendingSeek,
        clearPendingSeek: () => {
            pendingSeek = null;
        },
    };

    return adapter;
}
