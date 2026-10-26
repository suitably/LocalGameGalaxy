import { describe, expect, it } from 'vitest';
import { TAP_ALONG_INTERVAL_MS, tapAlongClicks, tapAlongLatency } from './tapAlong';

const clicks = tapAlongClicks(1000);

describe('tap-along calibration', () => {
  it('takes the median delay of the taps after the warm-up', () => {
    const jitter = [5, -8, 3, 0, 9, -4, 2, -6, 7];
    const taps = clicks.map((c, i) => c + 120 + (jitter[i % jitter.length] ?? 0));
    const r = tapAlongLatency(clicks, taps);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(Math.abs(r.latencyMs - 120)).toBeLessThanOrEqual(5);
  });

  it('ignores warm-up taps, double taps and taps far from any click', () => {
    const taps = clicks.flatMap((c, i) => (i < 3 ? [c + 400] : [c + 80, c + 85]));
    taps.push(clicks[5] + TAP_ALONG_INTERVAL_MS / 2);
    const r = tapAlongLatency(clicks, taps);
    expect(r).toMatchObject({ ok: true, latencyMs: 80, taps: 9 });
  });

  it('fails with too few or too uneven taps', () => {
    expect(
      tapAlongLatency(
        clicks,
        clicks.slice(0, 6).map((c) => c + 50),
      ),
    ).toMatchObject({
      ok: false,
      reason: 'few_taps',
    });
    const uneven = clicks.map((c, i) => c + (i % 2 ? 0 : 150));
    expect(tapAlongLatency(clicks, uneven)).toMatchObject({ ok: false, reason: 'uneven' });
  });
});
