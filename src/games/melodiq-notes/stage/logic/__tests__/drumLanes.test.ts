import { describe, expect, it } from 'vitest';
import type { ScorePart } from '../../../../../modules/music-score';
import { buildChart } from '../charts';
import { drumColorLane, drumKeyOf, drumKitOf, padLane } from '../drumLanes';
import { nearestOpenNote, pendingNotes } from '../judging';

const kitPart = (pitches: number[]): ScorePart => ({
  id: 'd',
  name: 'Drums',
  isDrum: true,
  program: null,
  guess: 'drums',
  notes: pitches.map((pitch, i) => ({ t: i, dur: 1, pitch })),
});

// crash, hi-hat, snare, tom 1, tom 2, tom 3, floor tom, tambourine, clap, kick
const FULL = [49, 42, 38, 48, 47, 45, 43, 54, 39, 36];

describe('drum kit lanes (#571)', () => {
  it('gives every kit piece its own lane and puts percussion on the percussion lane', () => {
    const chart = buildChart(kitPart(FULL), 'drums');
    expect(chart.map((n) => n.lane)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 7, 8]);
    expect(chart[7].drum).toBe('tambourine');
    expect(chart[8].drum).toBe('other');
  });

  it('shows only the lanes the song uses, percussion display-only by default', () => {
    const kit = drumKitOf(buildChart(kitPart([38, 47, 54, 36]), 'drums'), {
      judgePercussion: false,
      mergeToms: false,
    });
    expect(kit.pads).toEqual([2, 4, 7]);
    expect(kit.notes.map((n) => n.lane)).toEqual([2, 4, 8]);
    expect(kit.shown.map((n) => n.drum)).toEqual(['tambourine']);
  });

  it('judges percussion when the player asks for it', () => {
    const kit = drumKitOf(buildChart(kitPart([38, 54]), 'drums'), {
      judgePercussion: true,
      mergeToms: false,
    });
    expect(kit.notes.map((n) => n.lane)).toEqual([2, 7]);
    expect(kit.shown).toEqual([]);
  });

  it('merges the toms on one pult pad, keeping ids and colours, without percussion', () => {
    const chart = buildChart(kitPart(FULL), 'drums');
    const kit = drumKitOf(chart, { judgePercussion: false, mergeToms: true });
    expect(kit.pads).toEqual([0, 1, 2, 3]);
    expect(kit.shown).toEqual([]);
    expect(kit.notes.map((n) => n.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 9]);
    expect(kit.notes.slice(3, 7).map((n) => n.lane)).toEqual([3, 3, 3, 3]);
    expect(kit.notes.slice(3, 7).map(drumColorLane)).toEqual([3, 4, 5, 6]);
    expect(padLane(kit, 6)).toBe(3);
    expect(padLane({ mergeToms: false }, 6)).toBe(6);
  });

  it('never judges or waits for a display-only percussion note', () => {
    const kit = drumKitOf(buildChart(kitPart([54, 38]), 'drums'), {
      judgePercussion: false,
      mergeToms: false,
    });
    expect(nearestOpenNote(kit.notes, 7, 0, 0.5)).toBeNull();
    expect(pendingNotes(kit.notes, null).map((n) => n.lane)).toEqual([2]);
  });

  it('falls back to four pads for a part without pad notes', () => {
    expect(drumKitOf([], { judgePercussion: false, mergeToms: false }).pads).toEqual([0, 1, 2, 3]);
  });

  it('keeps D F J and Space, and gives the shown toms K L ; in order', () => {
    const pads = [0, 1, 2, 3, 5, 6];
    expect([0, 1, 2, 3, 5, 6, 8].map((l) => drumKeyOf(l, pads)?.key)).toEqual([
      'D',
      'F',
      'J',
      'K',
      'L',
      ';',
      '␣',
    ]);
    expect(drumKeyOf(7, pads)?.key).toBe('G');
  });
});
