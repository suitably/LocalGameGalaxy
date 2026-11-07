import { describe, expect, it } from 'vitest';
import { ALIGN_VERSION, type ScoreSong } from '../../../../../modules/music-score';
import { freshMarks, needsAlignment, storedStatus } from '../folderAlignment';

const song = {
  title: 't',
  artist: '',
  source: 't',
  tempoMap: [{ beat: 0, bpm: 120 }],
  measureStarts: [0, 4, 8, 12, 16, 20],
  measureLengths: [4, 4, 4, 4, 4, 4],
  measureNumbers: [1, 2, 3, 4, 5, 6],
  end: 24,
  parts: [],
} as unknown as ScoreSong;

describe('storedStatus', () => {
  it('tells missing, current, outdated and hand-edited marks apart', () => {
    expect(storedStatus(null)).toBe('none');
    expect(storedStatus({ aligner: ALIGN_VERSION, offsetSec: 0 })).toBe('current');
    expect(storedStatus({ aligner: null, offsetSec: 0 })).toBe('outdated');
    expect(storedStatus({ aligner: 1, edited: true, offsetSec: 0 })).toBe('edited');
  });
});

describe('needsAlignment', () => {
  it('takes missing and outdated marks only', () => {
    expect(
      ['none', 'current', 'outdated', 'edited'].filter((s) => needsAlignment(s as never)),
    ).toEqual(['none', 'outdated']);
  });
});

describe('freshMarks', () => {
  it('stores the current version and the mode the check suggests', () => {
    const marks = [0, 4, 8, 12, 16, 20, 24].map((beat) => ({ beat, sec: 0.3 + beat * 0.5 }));
    const { stored, quality } = freshMarks(song, marks, 'take.mp3');
    expect(quality.verdict).toBe('good');
    expect(stored).toEqual({
      marks,
      offsetSec: 0,
      audio: 'take.mp3',
      aligner: ALIGN_VERSION,
      mode: 'steady',
      edited: false,
    });
  });
});
