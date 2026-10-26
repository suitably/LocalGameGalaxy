import { describe, it, expect } from 'vitest';
import type { ScorePart, ScoreSong } from '../../../../../modules/music-score';
import { buildChart, noteName, pitchRange, type StageNote } from '../charts';
import {
  accuracy,
  multiplier,
  nearestOpenNote,
  newStats,
  pendingNotes,
  pitchJudgement,
  recordJudgement,
  sectionScore,
  stars,
  timingJudgement,
} from '../judging';
import { buildSections, sectionIndexAt } from '../sections';
import { panelRects, shouldSuggestLandscape } from '../layout';

const part = (notes: [number, number][], isDrum = false): ScorePart => ({
  id: 'p',
  name: 'p',
  isDrum,
  program: null,
  guess: 'keyboard',
  notes: notes.map(([t, pitch]) => ({ t, dur: 1, pitch })),
});

const stageNote = (t: number, lane: number, extra: Partial<StageNote> = {}): StageNote => ({
  id: 0,
  t,
  dur: 1,
  pitch: lane,
  lane,
  judged: null,
  acc: 0,
  started: false,
  ...extra,
});

describe('buildChart', () => {
  it('keeps every note for the keyboard', () => {
    const chart = buildChart(
      part([
        [0, 60],
        [0, 64],
        [1, 67],
      ]),
      'keyboard',
    );
    expect(chart.map((n) => n.lane)).toEqual([60, 64, 67]);
    expect(chart.every((n) => n.judged === null)).toBe(true);
  });

  it('reduces a part to one line for singing', () => {
    expect(
      buildChart(
        part([
          [0, 60],
          [0, 64],
          [1, 67],
        ]),
        'vocals',
      ).map((n) => n.pitch),
    ).toEqual([64, 67]);
  });

  it('tabs a part for the bass with sounding pitch kept', () => {
    const chart = buildChart(
      part([
        [0, 40],
        [1, 45],
      ]),
      'bass',
    );
    expect(chart).toHaveLength(2);
    for (const n of chart) expect([43, 38, 33, 28][n.lane] + (n.fret ?? 0)).toBe(n.pitch);
  });

  it('maps drum keys to lanes and drops duplicates', () => {
    const chart = buildChart(
      part(
        [
          [0, 36],
          [0, 35],
          [0, 42],
          [1, 38],
        ],
        true,
      ),
      'drums',
    );
    expect(chart.map((n) => [n.t, n.lane])).toEqual([
      [0, 1],
      [0, 4],
      [1, 2],
    ]);
  });

  it('describes pitch ranges and names', () => {
    expect(pitchRange([stageNote(0, 60), stageNote(1, 72), stageNote(2, 64)])).toEqual({
      lo: 60,
      hi: 72,
      median: 64,
    });
    expect(noteName(61)).toBe('C#4');
  });
});

describe('judging', () => {
  it('scores with a growing multiplier and resets on a miss', () => {
    const stats = newStats(2);
    for (let i = 0; i < 9; i++) recordJudgement(stats, 0, 'perfect');
    expect(multiplier(stats.combo)).toBe(2);
    // hits 1–7 count once, from the 8th in a row twice
    expect(stats.score).toBe(7 * 100 + 2 * 200);
    recordJudgement(stats, 1, 'miss');
    expect(stats.combo).toBe(0);
    expect(stats.maxCombo).toBe(9);
    expect(accuracy(stats)).toBeCloseTo(0.9);
    expect(sectionScore(stats.sections[1])).toBe(0);
    expect(stars(accuracy(stats))).toBe(3);
  });

  it('judges timing and sung notes', () => {
    expect(timingJudgement(0.05)).toBe('perfect');
    expect(timingJudgement(-0.1)).toBe('good');
    expect(timingJudgement(0.2)).toBeNull();
    expect(pitchJudgement(0.5)).toBe('good');
  });

  it('finds the open chord the song waits for, inside a loop', () => {
    const notes = [
      stageNote(0, 60, { judged: 'learn' }),
      stageNote(1, 62),
      stageNote(1, 65),
      stageNote(2, 67),
    ];
    expect(pendingNotes(notes, null).map((n) => n.lane)).toEqual([62, 65]);
    expect(pendingNotes(notes, { from: 2, to: 4 }).map((n) => n.lane)).toEqual([67]);
  });

  it('finds the closest open note on a lane', () => {
    const notes = [stageNote(0, 60), stageNote(1, 60), stageNote(1, 62)];
    expect(nearestOpenNote(notes, 60, 0.9, 0.5)?.note.t).toBe(1);
    expect(nearestOpenNote(notes, 64, 1, 0.5)).toBeNull();
  });

  it('prefers the exact drum voice and falls back to the same instrument', () => {
    const notes = [
      stageNote(1, 1, { drum: 'hihatClosed' }),
      stageNote(1, 1, { drum: 'hihatOpen' }),
    ];
    expect(nearestOpenNote(notes, 1, 1, 0.5, 'hihatOpen')?.note.drum).toBe('hihatOpen');
    expect(nearestOpenNote(notes, 1, 1, 0.5, 'hihatClosed')?.note.drum).toBe('hihatClosed');
    expect(nearestOpenNote(notes, 1, 1, 0.5, 'hihatPedal')).not.toBeNull();
    expect(nearestOpenNote(notes, 1, 1, 0.5)).not.toBeNull();
  });

  it('builds drum charts with voice and sticking, one note per voice', () => {
    const part: ScorePart = {
      id: 'd',
      name: 'Drums',
      isDrum: true,
      program: null,
      guess: 'drums',
      notes: [
        { t: 0, dur: 1, pitch: 42, hand: 'R' },
        { t: 0, dur: 1, pitch: 46, drum: 'hihatOpen' },
        { t: 1, dur: 1, pitch: 47 },
      ],
    };
    const chart = buildChart(part, 'drums');
    expect(chart.map((n) => [n.lane, n.drum, n.hand])).toEqual([
      [1, 'hihatClosed', 'R'],
      [1, 'hihatOpen', undefined],
      [3, 'tom2', undefined],
    ]);
  });
});

describe('sections', () => {
  const song = (bars: number): ScoreSong => ({
    title: '',
    artist: '',
    source: '',
    tempoMap: [{ beat: 0, bpm: 120 }],
    measureStarts: Array.from({ length: bars }, (_, i) => i * 4),
    measureLengths: Array(bars).fill(4),
    measureNumbers: Array.from({ length: bars }, (_, i) => i + 1),
    end: bars * 4,
    parts: [],
  });

  it('uses one section per bar, also for long songs', () => {
    expect(buildSections(song(8))).toHaveLength(8);
    const long = buildSections(song(150));
    expect(long).toHaveLength(150);
    expect(long[1]).toEqual({ from: 4, to: 8, firstBar: 2, lastBar: 2 });
    expect(long[149].to).toBe(600);
    expect(sectionIndexAt(long, 41)).toBe(10);
  });
});

describe('layout', () => {
  it('splits the stage per player', () => {
    expect(panelRects(1, 800, 400)).toEqual([{ x: 0, y: 0, w: 800, h: 400 }]);
    const two = panelRects(2, 800, 400);
    expect(two[1].x).toBeGreaterThan(399);
    expect(panelRects(2, 400, 800)[1].y).toBeGreaterThan(399);
    expect(panelRects(4, 800, 400)).toHaveLength(4);
    expect(shouldSuggestLandscape(2, 400, 800)).toBe(true);
  });
});

describe('keyAction', () => {
  it('maps physical keys per instrument', async () => {
    const { keyAction } = await import('../keyboardInput');
    expect(keyAction('KeyD', 'keys', 60, 0, true)).toEqual({ kind: 'lane', lane: 64 });
    expect(keyAction('KeyY', 'keys', 60, 0, true)).toEqual({ kind: 'lane', lane: 68 });
    expect(keyAction('Digit5', 'strings', 0, 4, true)).toBeNull();
    expect(keyAction('Digit2', 'strings', 0, 6, true)).toEqual({ kind: 'lane', lane: 1 });
    expect(keyAction('Space', 'drums', 0, 0, true)).toEqual({ kind: 'lane', lane: 4 });
    expect(keyAction('Space', 'pitch', 0, 0, false)).toEqual({ kind: 'sing', on: false });
    expect(keyAction('KeyD', 'keys', 60, 0, false)).toBeNull();
  });
});
