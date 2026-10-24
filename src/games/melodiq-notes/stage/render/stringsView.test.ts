import { describe, expect, it } from 'vitest';
import type { StagePlayer } from '../engine/types';
import type { Ctx } from './common';
import { stringGeometry } from './geometry';
import { drawStrings } from './stringsView';
import type { ViewContext } from './view';

/** A 2D context that draws nothing and records the circles drawn (note heads). */
function recordingContext() {
  const arcs: { x: number; y: number; r: number }[] = [];
  const g = new Proxy(
    {},
    {
      get: (_, key) => {
        if (key === 'arc') return (x: number, y: number, r: number) => arcs.push({ x, y, r });
        if (key === 'createLinearGradient') return () => ({ addColorStop: () => {} });
        return () => {};
      },
      set: () => true,
    },
  ) as Ctx;
  return { g, arcs };
}

describe('drawStrings', () => {
  it('centres a note head on the hit line at the note’s time', () => {
    const note = { t: 8, dur: 1, lane: 2, fret: 3, pitch: 55 };
    const p = {
      instrument: { kind: 'guitar', color: '#888888' },
      notes: [note],
      pending: [note],
      maxDur: 1,
      pressed: new Set<number>(),
    } as unknown as StagePlayer;
    const { g, arcs } = recordingContext();
    const v = {
      g,
      p,
      song: { measureStarts: [0, 4, 8, 12] },
      w: 800,
      h: 240,
      beat: note.t,
      isFocus: false,
      idle: false,
      texts: {},
    } as unknown as ViewContext;
    drawStrings(v);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].x).toBeCloseTo(stringGeometry(p, v.w, v.h).hitX);
  });
});
