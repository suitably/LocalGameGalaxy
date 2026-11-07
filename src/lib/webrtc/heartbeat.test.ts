import { describe, expect, it } from 'vitest';
import {
  HEARTBEAT_CHECK_MS,
  PEER_TIMEOUT_MS,
  PING_INTERVAL_MS,
  isHeartbeatMessage,
  isPeerStale,
  isPingDue,
  pingMessage,
  pongFor,
} from './heartbeat';

describe('isPeerStale', () => {
  it.each([
    [0, 0, false],
    [0, PEER_TIMEOUT_MS - 1, false],
    [0, PEER_TIMEOUT_MS, true],
    [1000, 1000 + PEER_TIMEOUT_MS + 1, true],
  ])('last seen %i, now %i → %s', (last, now, stale) => {
    expect(isPeerStale(last, now)).toBe(stale);
  });
});

describe('isPingDue', () => {
  it.each([
    [null, 0, true],
    [0, PING_INTERVAL_MS - 1, false],
    [0, PING_INTERVAL_MS, true],
  ])('last ping %s, now %i → %s', (last, now, due) => {
    expect(isPingDue(last, now)).toBe(due);
  });
});

describe('messages', () => {
  it('answers a ping with a pong carrying the same time', () => {
    expect(pongFor(pingMessage(42))).toEqual({ type: 'pong', t: 42 });
  });

  it('recognises only ping and pong', () => {
    expect(isHeartbeatMessage({ type: 'ping', t: 1 })).toBe(true);
    expect(isHeartbeatMessage({ type: 'pong', t: 1 })).toBe(true);
    expect(isHeartbeatMessage({ type: 'identify' })).toBe(false);
    expect(isHeartbeatMessage(null)).toBe(false);
  });

  it('detects a silent peer within 16 s of the last pong', () => {
    expect(PEER_TIMEOUT_MS + HEARTBEAT_CHECK_MS).toBeLessThanOrEqual(16000);
  });
});
