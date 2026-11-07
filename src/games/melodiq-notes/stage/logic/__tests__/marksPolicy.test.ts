import { describe, expect, it } from 'vitest';
import { ALIGN_VERSION } from '../../../../../modules/music-score';
import { barRanges, storedMarksPlan, storedMode } from '../marksPolicy';

describe('storedMarksPlan', () => {
  it('aligns when nothing is stored', () => {
    expect(storedMarksPlan(null, 'notes')).toBe('align');
  });

  it('plays marks of the current alignment', () => {
    expect(storedMarksPlan({ aligner: ALIGN_VERSION, offsetSec: 0 }, 'notes')).toBe('use');
  });

  it('aligns again when the marks come from an older alignment', () => {
    expect(storedMarksPlan({ aligner: ALIGN_VERSION - 1, offsetSec: 0 }, 'notes')).toBe('realign');
    // stored before the version was kept and never touched ("Wonderwall" on 2026-11-05)
    expect(storedMarksPlan({ offsetSec: 0 }, 'notes')).toBe('realign');
    expect(storedMarksPlan({ aligner: null, offsetSec: 0 }, 'notes')).toBe('realign');
  });

  it('keeps marks someone corrected by hand', () => {
    expect(storedMarksPlan({ aligner: 1, edited: true, offsetSec: 0 }, 'notes')).toBe('use');
    expect(storedMarksPlan({ offsetSec: 0.19 }, 'notes')).toBe('use');
  });

  it('always plays karaoke marks', () => {
    expect(storedMarksPlan({ offsetSec: 0 }, 'karaoke')).toBe('use');
  });
});

describe('storedMode', () => {
  it('defaults to bar by bar', () => {
    expect(storedMode(null)).toBe('bars');
    expect(storedMode({})).toBe('bars');
    expect(storedMode({ mode: 'steady' })).toBe('steady');
  });
});

describe('barRanges', () => {
  it('joins neighbouring bars and uses the written numbers', () => {
    expect(barRanges([66, 64, 65, 86, 87, 90], [])).toBe('65–67, 87–88, 91');
    expect(barRanges([1, 2], [1, 5, 6])).toBe('5–6');
  });
});
