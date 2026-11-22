import { describe, expect, it } from 'vitest';
import { applyMarkerEvent, markerExpired, markerSelector, MARKER_TTL_MS } from './roomMarkers';

const NOW = 1_000_000;
const marker = (to: string, by = 'h', at = NOW, target = 'kniffel.roll') =>
  ({ type: 'marker', to, target, by, at }) as const;

describe('room markers', () => {
  it('shows markers for this device, for everyone, and its own', () => {
    expect(applyMarkerEvent(null, marker('me'), 'me', NOW)?.target).toBe('kniffel.roll');
    expect(applyMarkerEvent(null, marker('all'), 'me', NOW)).not.toBeNull();
    expect(applyMarkerEvent(null, marker('x', 'me'), 'me', NOW)).not.toBeNull();
    expect(applyMarkerEvent(null, marker('x'), 'me', NOW)).toBeNull();
  });

  it('ignores stale and older events, clears on clear', () => {
    expect(applyMarkerEvent(null, marker('me', 'h', NOW - 31_000), 'me', NOW)).toBeNull();
    const shown = applyMarkerEvent(null, marker('me', 'h', NOW), 'me', NOW);
    expect(applyMarkerEvent(shown, marker('me', 'h', NOW - 5, 'x'), 'me', NOW)).toBe(shown);
    expect(
      applyMarkerEvent(shown, { type: 'clear', to: 'me', by: 'h', at: NOW + 1 }, 'me', NOW),
    ).toBeNull();
    expect(applyMarkerEvent(shown, null, 'me', NOW)).toBe(shown);
  });

  it('expires and builds a safe selector', () => {
    expect(markerExpired({ target: 't', by: 'h', at: NOW }, NOW + MARKER_TTL_MS)).toBe(true);
    expect(markerExpired({ target: 't', by: 'h', at: NOW }, NOW + 10)).toBe(false);
    expect(markerSelector('a"b')).toBe('[data-room-target="a\\"b"]');
  });
});
