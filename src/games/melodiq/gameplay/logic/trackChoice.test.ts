import { describe, expect, it } from 'vitest';
import { buildTrackSelectMessage, isDuet } from './trackChoice';

describe('trackChoice', () => {
  it('detects duets', () => {
    expect(isDuet(1)).toBe(false);
    expect(isDuet(2)).toBe(true);
  });

  it('builds a trackSelect message for valid tracks', () => {
    expect(buildTrackSelectMessage(0, 2)).toEqual({ type: 'trackSelect', trackIndex: 0 });
    expect(buildTrackSelectMessage(1, 2)).toEqual({ type: 'trackSelect', trackIndex: 1 });
  });

  it('rejects out-of-range or non-integer tracks', () => {
    expect(buildTrackSelectMessage(2, 2)).toBeNull();
    expect(buildTrackSelectMessage(-1, 2)).toBeNull();
    expect(buildTrackSelectMessage(0.5, 2)).toBeNull();
  });
});
