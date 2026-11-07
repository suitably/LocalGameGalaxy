import { describe, expect, it } from 'vitest';
import type { MarkQuality } from '../../../../../modules/music-score';
import { markCheckText } from '../markCheckText';

const k = (key: string, opts?: Record<string, unknown>) =>
  `${key}${opts ? JSON.stringify(opts) : ''}`;
const song = { measureNumbers: [1, 2, 3, 4], tempoMap: [{ beat: 0, bpm: 105 }] };
const quality = (q: Partial<MarkQuality>): MarkQuality => ({
  verdict: 'good',
  steady: false,
  fit: { startSec: 0, ratio: 1 },
  suspectBars: [],
  maxOffLineSec: 0,
  ...q,
});

describe('markCheckText', () => {
  it('names suspect bars by their written numbers', () => {
    expect(markCheckText(k, song, quality({ verdict: 'unsure', suspectBars: [1, 2] }))).toEqual({
      text: 'quality_unsure{"bars":"2–3"}',
      unsure: true,
    });
  });

  it('reports an implausible tempo', () => {
    const r = markCheckText(
      k,
      song,
      quality({ verdict: 'unsure', fit: { startSec: 0, ratio: 0.5 } }),
    );
    expect(r.text).toBe('quality_tempo{"percent":200}');
  });

  it('gives the steady tempo in BPM', () => {
    const r = markCheckText(
      k,
      song,
      quality({ steady: true, fit: { startSec: 0, ratio: 0.9995 } }),
    );
    expect(r).toEqual({ text: 'quality_good_steady{"bpm":"105.1"}', unsure: false });
    expect(markCheckText(k, song, quality({})).text).toBe('quality_good');
  });
});
