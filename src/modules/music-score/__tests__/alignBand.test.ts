import { describe, it, expect } from 'vitest';
import { alignRecording } from '../alignment';
import { bandSong, barErrors, onlyParts, renderBand, type RenderOptions } from './bandFixtures';

const drift: RenderOptions['factorAt'] = (b) => (b < 20 ? 1.06 : b < 32 ? 0.97 : 1.02);

/** Renders the full band, aligns the given score to it and returns the bar errors. */
async function alignCase(scoreParts: string[], opts: Partial<RenderOptions> = {}) {
  const song = bandSong();
  const { samples, truth } = renderBand(song, { startSec: 2.3, factorAt: drift, ...opts });
  const result = await alignRecording(onlyParts(song, scoreParts), samples);
  return { ...barErrors(result.marks, truth), ...result };
}

describe('alignRecording on a band recording', () => {
  it('aligns a full-band score', async () => {
    const e = await alignCase(['g', 'b', 'd', 'v']);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a drums-only score', async () => {
    const e = await alignCase(['d']);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a guitar-only score against the full mix', async () => {
    const e = await alignCase(['g']);
    expect(e.max).toBeLessThan(0.05);
    expect(e.median).toBeLessThan(0.025);
  });

  it('aligns a guitar-only score when the band tuned down a half-step', async () => {
    const e = await alignCase(['g'], { cents: -100 });
    expect(e.tuning.semitones).toBe(-1);
    expect(e.max).toBeLessThan(0.05);
  });

  it('aligns a guitar-only score when the recording is 30 cents flat', async () => {
    const e = await alignCase(['g'], { cents: -30 });
    // the plucked strings render a few cents off (whole-sample periods), so the estimate is loose
    expect(e.tuning.semitones).toBe(0);
    expect(Math.abs(e.tuning.cents + 30)).toBeLessThan(15);
    expect(e.max).toBeLessThan(0.05);
  });
});
