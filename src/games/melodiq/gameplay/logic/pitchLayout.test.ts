import { describe, expect, it } from 'vitest';
import type { Note } from '../../parser';
import {
  computePitchLayout,
  getNoteName,
  interpolateAudioTime,
  nextOctaveShift,
  octaveTargetPitch,
  resolveDisplayedPitch,
} from './pitchLayout';

const note = (start: number, duration: number, pitch: number, type = ':'): Note => ({
  start,
  duration,
  pitch,
  type,
  text: 'la',
});

describe('getNoteName', () => {
  it('names MIDI notes', () => {
    expect(getNoteName(60)).toBe('C4');
    expect(getNoteName(70)).toBe('A#4');
    expect(getNoteName(59.6)).toBe('C4');
  });
});

describe('computePitchLayout', () => {
  it('falls back to defaults without melody notes', () => {
    expect(computePitchLayout([], 300, 1)).toEqual({ centerPitch: 60, noteHeight: 18 });
    expect(computePitchLayout([note(0, 1, 0, '-')], 300, 1)).toEqual({
      centerPitch: 60,
      noteHeight: 18,
    });
  });

  it('centres the range and clamps the note height', () => {
    const notes = [note(0, 1, 60), note(1, 1, 70)];
    expect(computePitchLayout(notes, 140, 1)).toEqual({ centerPitch: 65, noteHeight: 10 });
    expect(computePitchLayout(notes, 4000, 1).noteHeight).toBe(30);
  });
});

describe('octaveTargetPitch', () => {
  const notes = [note(0, 4, 60), note(10, 4, 72)];

  it('prefers the active note, then a near future note, then the centre', () => {
    expect(octaveTargetPitch(notes, 2, 65)).toBe(60);
    expect(octaveTargetPitch(notes, 8, 65)).toBe(72);
    expect(octaveTargetPitch(notes, 5, 65)).toBe(65);
  });
});

describe('nextOctaveShift', () => {
  it('keeps the shift when the improvement is small', () => {
    expect(nextOctaveShift(60, 62, 0)).toBe(0);
  });

  it('jumps an octave when the sung pitch is far off', () => {
    expect(nextOctaveShift(48, 62, 0)).toBe(12);
  });
});

describe('resolveDisplayedPitch', () => {
  it('shows the live pitch at full alpha', () => {
    expect(resolveDisplayedPitch(60, 55, 10, false)).toEqual({ pitch: 60, alpha: 1 });
  });

  it('fades the last valid pitch out over 300 ms', () => {
    expect(resolveDisplayedPitch(-1, 55, 150, false)).toEqual({ pitch: 55, alpha: 0.5 });
    expect(resolveDisplayedPitch(-1, 55, 400, false)).toEqual({ pitch: null, alpha: 0 });
  });

  it('shows nothing while paused', () => {
    expect(resolveDisplayedPitch(60, 55, 0, true)).toEqual({ pitch: null, alpha: 0 });
  });
});

describe('interpolateAudioTime', () => {
  it('resyncs on a new raw value', () => {
    const r = interpolateAudioTime({ lastAudioTime: 1, lastRealTime: 0 }, 1.1, false, 100);
    expect(r.time).toBe(1.1);
    expect(r.clock).toEqual({ lastAudioTime: 1.1, lastRealTime: 100 });
  });

  it('extrapolates between updates, capped at 0.3 s', () => {
    const clock = { lastAudioTime: 2, lastRealTime: 0 };
    expect(interpolateAudioTime(clock, 2, false, 100).time).toBeCloseTo(2.1);
    expect(interpolateAudioTime(clock, 2, false, 1000).time).toBeCloseTo(2.3);
  });

  it('does not extrapolate when stopped', () => {
    expect(interpolateAudioTime({ lastAudioTime: 2, lastRealTime: 0 }, 2, true, 500).time).toBe(2);
  });
});
