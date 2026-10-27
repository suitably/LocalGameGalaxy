import { describe, expect, it } from 'vitest';
import { movedTooFar, LONG_PRESS_TOLERANCE } from '../useTouchLongPress';

describe('movedTooFar (#548)', () => {
  it('treats small finger jitter as a still press and larger moves as a drag', () => {
    const start = { x: 100, y: 100 };
    expect(movedTooFar(start, { x: 104, y: 103 })).toBe(false);
    expect(movedTooFar(start, { x: 100 + LONG_PRESS_TOLERANCE, y: 100 })).toBe(false);
    expect(movedTooFar(start, { x: 108, y: 108 })).toBe(true);
  });
});
