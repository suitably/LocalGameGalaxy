import { describe, expect, it } from 'vitest';
import { alignPercent, recordingStatus } from '../recordingStatus';

describe('recordingStatus', () => {
  it('is none without a recording, whatever the alignment says', () => {
    expect(recordingStatus(false, { kind: 'done' }, true)).toEqual({ kind: 'none' });
  });

  it('reports a running alignment with its overall percent', () => {
    expect(
      recordingStatus(true, { kind: 'running', stage: 'match', fraction: 0.5 }, false),
    ).toEqual({ kind: 'running', stage: 'match', percent: 50 });
  });

  it('reports a failure over existing marks', () => {
    expect(recordingStatus(true, { kind: 'failed', error: 'x' }, true)).toEqual({
      kind: 'failed',
      error: 'x',
    });
  });

  it('is aligned with marks and unaligned without', () => {
    expect(recordingStatus(true, { kind: 'done' }, true)).toEqual({ kind: 'aligned' });
    expect(recordingStatus(true, { kind: 'none' }, false)).toEqual({ kind: 'unaligned' });
  });
});

describe('alignPercent', () => {
  it('splits the bar evenly between the three stages', () => {
    expect(alignPercent('analyse', 0)).toBe(0);
    expect(alignPercent('refine', 1)).toBe(100);
  });
});
