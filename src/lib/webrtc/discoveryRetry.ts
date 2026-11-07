/**
 * Re-announce schedule for a phone that has not found the host yet.
 *
 * A WebSocket tracker hands each announce (at most 5 offers) to random peers of the swarm, and
 * re-announces only every 2 minutes on its own. With several phones in the swarm the host is
 * often not among them, so the client announces again: 3 s, then 1.5× longer, at most 15 s.
 */
export const DISCOVERY_RETRY_FIRST_MS = 3000;
export const DISCOVERY_RETRY_MAX_MS = 15000;

export function discoveryRetryDelay(attempt: number): number {
  const delay = DISCOVERY_RETRY_FIRST_MS * 1.5 ** Math.max(0, attempt);
  return Math.min(DISCOVERY_RETRY_MAX_MS, Math.round(delay));
}
