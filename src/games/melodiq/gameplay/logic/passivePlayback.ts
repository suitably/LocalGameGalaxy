/** How long a passive screen waits before asking its media to play again, e.g. after a block. */
export const PASSIVE_PLAY_RETRY_MS = 1000;

/**
 * A passive screen plays when the host's `isPlaying` changes, but that moment can pass before its
 * media exists: a TV joining a running song mounts its `<audio>` only after loading. So while the
 * host plays, paused media that has not ended asks to play again, at most once per retry interval.
 */
export function shouldRetryPassivePlay(
  hostIsPlaying: boolean,
  audio: Pick<HTMLMediaElement, 'paused' | 'ended'> | null | undefined,
  now: number,
  nextAttemptAt: number,
): boolean {
  return hostIsPlaying && !!audio && audio.paused && !audio.ended && now >= nextAttemptAt;
}
