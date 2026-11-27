import { describe, expect, it } from 'vitest';
import { createRemoteClock } from './remoteClock';

describe('createRemoteClock', () => {
  it('runs on the local clock between reports', () => {
    const clock = createRemoteClock();
    clock.update(10, true, 1000);
    expect(clock.now(1000)).toBeCloseTo(10);
    expect(clock.now(1500)).toBeCloseTo(10.5);
  });

  it('trusts the fastest report and ignores late ones', () => {
    const clock = createRemoteClock();
    // host time = local time + 9 s; transport delay 5 ms, then 80 ms, then 40 ms
    clock.update(10.0, true, 1005);
    clock.update(10.1, true, 1180);
    clock.update(10.2, true, 1240);
    expect(clock.now(1300)).toBeCloseTo(10.295, 3);
  });

  it('improves when a faster report arrives', () => {
    const clock = createRemoteClock();
    clock.update(10.0, true, 1060);
    expect(clock.now(1100)).toBeCloseTo(10.04, 3);
    clock.update(10.1, true, 1102);
    expect(clock.now(1200)).toBeCloseTo(10.198, 3);
  });

  it('forgets a fast report after the window, so clock skew cannot build up', () => {
    const clock = createRemoteClock({ windowMs: 1000 });
    clock.update(10.0, true, 1000);
    clock.update(11.9, true, 3000); // 100 ms slower path
    expect(clock.now(3000)).toBeCloseTo(11.9, 3);
  });

  it('follows a forward seek on the host at once', () => {
    const clock = createRemoteClock();
    clock.update(10, true, 1000);
    clock.update(70, true, 1050);
    expect(clock.now(1100)).toBeCloseTo(70.05, 3);
  });

  it('follows a backward seek once the lower position holds', () => {
    const clock = createRemoteClock({ confirmBackMs: 500 });
    clock.update(70, true, 1000);
    clock.update(20, true, 1100);
    expect(clock.now(1100)).toBeCloseTo(70.1, 3); // not yet: could be a late report
    clock.update(20.3, true, 1400);
    clock.update(20.5, true, 1600);
    expect(clock.now(1600)).toBeCloseTo(20.5, 3);
  });

  it('does not jump back and forth for a single very late report', () => {
    const clock = createRemoteClock();
    clock.update(10.0, true, 1000);
    clock.update(10.033, true, 1033);
    clock.update(10.066, true, 1666); // arrived 600 ms late
    expect(clock.now(1666)).toBeCloseTo(10.666, 3);
    clock.update(10.7, true, 1700); // normal again
    expect(clock.now(1700)).toBeCloseTo(10.7, 3);
  });

  it('does not jump back during a burst of late reports shorter than the confirmation', () => {
    const clock = createRemoteClock({ confirmBackMs: 500 });
    clock.update(10, true, 1000);
    clock.update(10.1, true, 1500); // 400 ms late
    clock.update(10.2, true, 1700); // still late
    expect(clock.now(1700)).toBeCloseTo(10.7, 3);
    clock.update(10.75, true, 1750); // caught up
    expect(clock.now(1750)).toBeCloseTo(10.75, 3);
  });

  it('stands still while the host is paused and restarts cleanly', () => {
    const clock = createRemoteClock();
    clock.update(10, true, 1000);
    clock.update(10.4, false, 1400);
    expect(clock.now(5000)).toBe(10.4);
    clock.update(10.4, true, 9000);
    expect(clock.now(9100)).toBeCloseTo(10.5, 3);
  });

  it('reports 0 before the first report and after a reset', () => {
    const clock = createRemoteClock();
    expect(clock.now(123)).toBe(0);
    clock.update(10, true, 1000);
    clock.reset();
    expect(clock.now(2000)).toBe(0);
  });
});
