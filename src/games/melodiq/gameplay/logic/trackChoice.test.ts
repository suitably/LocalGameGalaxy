import { describe, expect, it } from 'vitest';
import {
  buildTrackSelectMessage,
  isDuet,
  parseAssignedTrack,
  pendingTrackRequest,
} from './trackChoice';

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

  it('reads the parts and the assigned part from songInfo', () => {
    expect(parseAssignedTrack({ trackIndex: 1, tracks: ['P1', 'P2'] })).toEqual({
      tracks: ['P1', 'P2'],
      trackIndex: 1,
      singing: true,
    });
    expect(parseAssignedTrack({ trackIndex: 0, tracks: ['P1'], singing: false })?.singing).toBe(
      false,
    );
    expect(parseAssignedTrack({ tracks: ['P1', 'P2'] })).toBeNull();
    expect(parseAssignedTrack({ trackIndex: 0 })).toBeNull();
    expect(parseAssignedTrack({ trackIndex: 2, tracks: ['P1', 'P2'] })).toBeNull();
    expect(parseAssignedTrack({ trackIndex: -1, tracks: ['P1'] })).toBeNull();
    expect(parseAssignedTrack({ trackIndex: '1', tracks: ['P1', 'P2'] })).toBeNull();
  });

  it('keeps asking for the wanted part until the host reports it', () => {
    const on = (trackIndex: number, singing = true) => ({
      tracks: ['A', 'B'],
      trackIndex,
      singing,
    });
    expect(pendingTrackRequest(null, on(0))).toBeNull();
    expect(pendingTrackRequest(1, null)).toBe(1);
    expect(pendingTrackRequest(1, on(0, false))).toBe(1);
    expect(pendingTrackRequest(1, on(0))).toBe(1);
    expect(pendingTrackRequest(1, on(1))).toBeNull();
  });
});
