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
    /(?:youtube(?:-nocookie)?\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
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
}
