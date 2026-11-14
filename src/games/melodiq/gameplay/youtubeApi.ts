/**
 * YouTube IFrame Player API utilities and video element adapter for Melodiq.
 */

// Global script loader promise to avoid duplicate injections
let ytApiPromise: Promise<void> | null = null;

export function getYouTubeVideoId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  let decoded = url;
  try {
    if (url.includes('%')) {
      decoded = decodeURIComponent(url);
    }
  } catch {
    // Ignore decode errors
  }

  // 1. Standard YouTube URL patterns
  const urlMatch = decoded.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
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

/**
 * Ensures the YouTube IFrame Player API script is loaded once.
 */
export function ensureYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const win = window as unknown as {
    YT?: { Player: unknown };
    onYouTubeIframeAPIReady?: () => void;
  };

  if (win.YT && win.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const existingScript = document.getElementById('youtube-iframe-api');
    if (existingScript) {
      const interval = setInterval(() => {
        if (win.YT && win.YT.Player) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);

    const prevCallback = win.onYouTubeIframeAPIReady;
    win.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') prevCallback();
      resolve();
    };
  });

  return ytApiPromise;
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
  /** Undocumented but stable: unloads a player module such as the caption renderer. */
  unloadModule?: (module: string) => void;
  setOption?: (module: string, option: string, value: unknown) => void;
}

/** The caption module is called `captions` in the HTML5 player and `cc` in older ones. */
const CAPTION_MODULES = ['captions', 'cc'] as const;

/**
 * Turns the video's own subtitles off. There is no player parameter for it: `cc_load_policy`
 * can only force captions on, and otherwise the viewer's YouTube preference and the uploader's
 * `yt:cc=on` tag decide. The karaoke lyrics are the subtitles here, so the module is unloaded.
 * Call it on `onReady` and again on `onApiChange`, which fires when the module (re)loads.
 */
export function disableYouTubeCaptions(player: YTPlayerInstance | null | undefined): void {
  if (!player) return;
  for (const module of CAPTION_MODULES) {
    // separate calls: a player without the module throws on either, nothing to turn off then
    for (const turnOff of [
      () => player.setOption?.(module, 'track', {}),
      () => player.unloadModule?.(module),
    ]) {
      try {
        turnOff();
      } catch {
        // ignored
      }
    }
  }
}
