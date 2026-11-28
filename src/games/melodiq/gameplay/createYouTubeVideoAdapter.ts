import type { YTPlayerInstance } from './youtubeApi';

export interface YouTubeVideoAdapterOptions {
  videoId: string;
  getPlayer: () => YTPlayerInstance | null;
  isPlayerReady: () => boolean;
  initialTime?: number;
}

/**
 * YouTube seeks are imprecise and rebuffer, so smaller corrections are ignored. When to seek or
 * change the rate is decided by the media sync (`COARSE_RATE_VIDEO_DRIFT_POLICY` in
 * `mediaDrift.ts`).
 */
const MIN_SEEK_SEC = 0.4;

export interface YouTubeVideoAdapter {
  src: string;
  error: null;
  currentTime: number;
  playbackRate: number;
  /** Seconds, NaN until known (like `HTMLMediaElement.duration`). */
  readonly duration: number;
  paused: boolean;
  readyState: number;
  muted: boolean;
  seeking: boolean;
  ended: boolean;
  /** The player takes only 0.25 rate steps (`COARSE_RATE_VIDEO_DRIFT_POLICY`). */
  coarseRate: true;
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
 * Ignores seeks under `MIN_SEEK_SEC` and deduplicates play/pause to avoid YouTube's animated
 * play/pause bezel icon during background video playback. It holds no sync policy of its own.
 */
export function createYouTubeVideoAdapter({
  videoId,
  getPlayer,
  isPlayerReady,
  initialTime = 0,
}: YouTubeVideoAdapterOptions): YouTubeVideoAdapter {
  let lastKnownTime = initialTime;

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
      const player = getPlayer();
      if (isPlayerReady() && player && typeof player.seekTo === 'function') {
        try {
          const cur = player.getCurrentTime() || 0;
          if (Math.abs(cur - t) > MIN_SEEK_SEC) player.seekTo(t, true);
        } catch {
          // ignore API seek errors
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
          const supportedRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
          let closest = 1;
          let minDiff = 999;
          for (const rate of supportedRates) {
            const diff = Math.abs(rate - r);
            if (diff < minDiff) {
              minDiff = diff;
              closest = rate;
            }
          }
          // Small drift corrections (e.g. 1.05) round back to 1: skip the iframe call
          // instead of sending one per frame
          if (closest !== (player.getPlaybackRate?.() || 1)) player.setPlaybackRate(closest);
        } catch {
          // ignore API errors
        }
      }
    },
    get duration() {
      const player = getPlayer();
      if (isPlayerReady() && player && typeof player.getDuration === 'function') {
        try {
          const d = player.getDuration();
          if (typeof d === 'number' && d > 0) return d;
        } catch {
          // ignore API read errors
        }
      }
      return NaN;
    },
    get paused() {
      const player = getPlayer();
      if (isPlayerReady() && player && typeof player.getPlayerState === 'function') {
        try {
          const state = player.getPlayerState();
          // 1: PLAYING, 3: BUFFERING -> Definitely NOT paused
          if (state === 1 || state === 3) return false;
          // 2: PAUSED, 0: ENDED, -1: UNSTARTED, 5: CUED -> not playing. Unstarted and cued count
          // as paused so the media sync starts them again instead of seeking a stopped player.
          if (state === 2 || state === 0 || state === -1 || state === 5) return true;
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
    coarseRate: true,
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
