/**
 * Data-channel heartbeat timing and messages (#647 S10).
 *
 * The host pings every connected phone each `PING_INTERVAL_MS`; a phone answers with a pong. A
 * peer that stayed silent for `PEER_TIMEOUT_MS` is gone: the host removes it, the phone treats
 * the host as lost and reconnects. Both sides check every `HEARTBEAT_CHECK_MS`, so a closed tab
 * is noticed within about 16 s.
 */
export const PING_INTERVAL_MS = 5000;
export const PEER_TIMEOUT_MS = 15000;
export const HEARTBEAT_CHECK_MS = 1000;

export interface PingMessage {
  type: 'ping';
  t: number;
}
export interface PongMessage {
  type: 'pong';
  t: number;
}
export type HeartbeatMessage = PingMessage | PongMessage;

/** True when nothing was heard from the peer for `PEER_TIMEOUT_MS`. */
export function isPeerStale(lastSeenAt: number, now: number): boolean {
  return now - lastSeenAt >= PEER_TIMEOUT_MS;
}

/** True when the next ping is due; `null` means none was sent yet. */
export function isPingDue(lastPingAt: number | null, now: number): boolean {
  return lastPingAt === null || now - lastPingAt >= PING_INTERVAL_MS;
}

export function isHeartbeatMessage(msg: unknown): msg is HeartbeatMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const type = (msg as { type?: unknown }).type;
  return type === 'ping' || type === 'pong';
}

export const pingMessage = (now: number): PingMessage => ({ type: 'ping', t: now });
export const pongFor = (ping: PingMessage): PongMessage => ({ type: 'pong', t: ping.t });

/** Round trips above this are ignored (a stalled tab, not the network). */
const MAX_RTT_SAMPLE_MS = 3000;

/**
 * Smoothed round-trip time from a pong (`now - pong.t`): exponential average, the first sample
 * taken as is. Invalid samples keep the previous estimate.
 */
export function smoothRtt(previous: number | null, sample: number): number | null {
  if (!Number.isFinite(sample) || sample < 0 || sample > MAX_RTT_SAMPLE_MS) return previous;
  return previous === null ? sample : previous + (sample - previous) * 0.25;
}
