import { describe, expect, it } from 'vitest';
import type { Note } from '../../logic/songVocals';
import { matchPitch, ratingFor, semitoneDistance, sungBeat } from './pitchMatch';
import { TRACK_MAX_POINTS } from './noteScoring';

const note = (start: number, duration: number, pitch: number, type: Note['type'] = ':'): Note => ({
  type,
  start,
  duration,
  pitch,
  text: 'la',
});

// Two beats of C4, then two of E4 (golden); a beat lasts 100 ms
const NOTES = [note(0, 2, 60), note(4, 2, 64, '*')];
const base = {
  notes: NOTES,
  deltaTimeMs: 100,
  beatDurationMs: 100,
  goldenNoteMultiplier: 2,
  scoreWeight: 1,
};

describe('sungBeat', () => {
  it('moves the beat back by latency and the age of a phone frame', () => {
    const at = { songTimeMs: 1000, latencyMs: 100, gapMs: 200, beatDurationMs: 100 };
    expect(sungBeat(at)).toBe(7);
    expect(sungBeat({ ...at, ageMs: 300 })).toBe(4);
  });
});

describe('matchPitch', () => {
  it('ignores the octave and rates by distance', () => {
    expect(semitoneDistance(72, 60)).toBe(0);
    expect(semitoneDistance(71, 60)).toBe(1);
    expect(ratingFor(0.1)).toBe('Perfect');
    expect(ratingFor(0.5)).toBe('Good');
    expect(ratingFor(1)).toBe('Okay');
  });

  it('scores a hit for the tick, golden notes counting double', () => {
    // 2 normal + 2 golden beats ×2 = 6 weighted beats; one beat = 1000 / 6 points
    const perBeat = TRACK_MAX_POINTS / 6;
    expect(matchPitch({ ...base, beat: 1, sungNote: 48 })).toEqual({
      kind: 'hit',
      noteIndex: 0,
      rating: 'Perfect',
      points: perBeat,
    });
    const golden = matchPitch({ ...base, beat: 5, sungNote: 64.5 });
    expect(golden).toMatchObject({ kind: 'hit', noteIndex: 1, rating: 'Good' });
    expect(golden.kind === 'hit' && golden.points).toBeCloseTo(perBeat * 2);
  });

  it('misses off-key notes and finds nothing between notes', () => {
    expect(matchPitch({ ...base, beat: 1, sungNote: 62 })).toEqual({ kind: 'miss', noteIndex: 0 });
    expect(matchPitch({ ...base, beat: 3, sungNote: 60 })).toEqual({ kind: 'none' });
  });

  it('a late phone frame still hits the note it was sung on', () => {
    // Arrives at song time 450 ms (beat 4.5 = E4), but was sung 250 ms earlier (beat 2 = C4)
    const beat = sungBeat({
      songTimeMs: 450,
      latencyMs: 0,
      ageMs: 250,
      gapMs: 0,
      beatDurationMs: 100,
    });
    expect(matchPitch({ ...base, beat, sungNote: 60 }).kind).toBe('hit');
    expect(matchPitch({ ...base, beat: 4.5, sungNote: 60 }).kind).toBe('miss');
  });
});
