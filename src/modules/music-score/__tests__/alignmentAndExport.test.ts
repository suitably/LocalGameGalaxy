import { describe, it, expect } from 'vitest';
import { alignRecording } from '../alignment';
import { ALIGN_SAMPLE_RATE } from '../dsp';
import { refineMarksWithOnsets } from '../onsets';
import { applyBarMarksToMusicXml, barTemposFromMarks, readAudioOffset } from '../tempoExport';
import { parseMusicXml } from '../musicXml';
import { createAudioMap, beatToSec, firstRecordedBeat } from '../timing';
import { assignTab, drumLaneOf, guessInstrument, STRING_TUNINGS, topLine } from '../instruments';
import type { BarMark, ScoreSong } from '../types';
import { REPEAT_SCORE, parseXml, serializeXml } from './fixtures';

/** Eight 4/4 bars at 100 bpm, a different chord per beat so the alignment has something to follow. */
function testSong(): ScoreSong {
  const roots = [60, 62, 64, 65, 67, 69, 71, 72, 57, 59];
  const notes = [];
  for (let b = 0; b < 32; b++) {
    const r = roots[(b * 7) % roots.length];
    for (const iv of [0, 4, 7]) notes.push({ t: b, dur: 1, pitch: r + iv });
  }
  return {
    title: 't',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: 100 }],
    measureStarts: [0, 4, 8, 12, 16, 20, 24, 28],
    measureLengths: Array(8).fill(4),
    measureNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    end: 32,
    parts: [{ id: 'p', name: 'Piano', notes, isDrum: false, program: 0, guess: 'keyboard' }],
  };
}

/** Renders the song with a drifting tempo and an intro of silence, returning the true bar times. */
function render(song: ScoreSong, startSec: number, factorAt: (beat: number) => number) {
  const truth: number[] = [];
  const beatSec: number[] = [];
  let t = startSec;
  for (let b = 0; b <= 32; b++) {
    beatSec.push(t);
    if (b % 4 === 0) truth.push(t);
    t += 0.6 * factorAt(b);
  }
  const sr = ALIGN_SAMPLE_RATE;
  const out = new Float32Array(Math.ceil((t + 1) * sr));
  for (const n of song.parts[0].notes) {
    const a = beatSec[n.t];
    const len = beatSec[n.t + 1] - a;
    const f = 440 * 2 ** ((n.pitch - 69) / 12);
    for (let i = 0; i < len * sr; i++) {
      const env = Math.exp((-3 * i) / sr);
      const s = Math.sin((2 * Math.PI * f * i) / sr) + 0.4 * Math.sin((4 * Math.PI * f * i) / sr);
      out[Math.floor(a * sr) + i] += 0.1 * env * s;
    }
  }
  return { samples: out, truth };
}

describe('alignRecording', () => {
  it('finds every bar of a recording that is slower, drifts and starts late', async () => {
    const song = testSong();
    const { samples, truth } = render(song, 1.5, (b) => (b < 16 ? 1.08 : 0.95));
    const { marks } = await alignRecording(song, samples);
    expect(marks).toHaveLength(9);
    const errors = truth.slice(0, 8).map((sec, i) => Math.abs(marks[i].sec - sec));
    expect(Math.max(...errors)).toBeLessThan(0.05);
  });
});

describe('refineMarksWithOnsets', () => {
  it('snaps to a clear nearby onset and keeps the order', () => {
    const onsets = new Float32Array(300).fill(1);
    onsets[105] = 20;
    const marks: BarMark[] = [
      { beat: 0, sec: 1.0 },
      { beat: 4, sec: 2.0 },
    ];
    expect(refineMarksWithOnsets(marks, onsets)).toEqual([
      { beat: 0, sec: 1.05 },
      { beat: 4, sec: 2.0 },
    ]);
  });
});

describe('createAudioMap', () => {
  const song = testSong();
  const marks = song.measureStarts
    .map((beat, i) => ({ beat, sec: 2 + i * 2.5 }))
    .concat({ beat: 32, sec: 22 });

  it('follows bar marks in both directions', () => {
    const map = createAudioMap(song, marks, 0.1);
    expect(map.secAt(6)).toBeCloseTo(2 + 2.5 * 1.5 + 0.1);
    expect(map.beatAt(map.secAt(13.3))).toBeCloseTo(13.3);
  });

  it('falls back to the score tempo plus offset', () => {
    const map = createAudioMap(song, null, 1);
    expect(map.secAt(4)).toBeCloseTo(beatToSec(song.tempoMap, 4) + 1);
  });
});

describe('firstRecordedBeat', () => {
  it('starts at the first bar the recording has', () => {
    const intro = [-4.4, -2.2, 0, 2.2, 4.4].map((sec, i) => ({ beat: i * 4, sec }));
    expect(firstRecordedBeat(intro)).toBe(8);
  });

  it('is 0 when bar 1 is in the recording or there are no marks', () => {
    expect(
      firstRecordedBeat([
        { beat: 0, sec: 1 },
        { beat: 4, sec: 3 },
      ]),
    ).toBe(0);
    expect(firstRecordedBeat(null)).toBe(0);
  });
});

describe('applyBarMarksToMusicXml', () => {
  it('writes per-bar tempos so the score plays in time with the recording', () => {
    const song = parseMusicXml(REPEAT_SCORE, 't.musicxml', parseXml);
    // bars take 3 s, 2 s, 3 s, 2.4 s in the recording, starting at 0.75 s
    const secs = [0.75, 3.75, 5.75, 8.75, 11.15];
    const marks = song.measureStarts
      .map((beat, i) => ({ beat, sec: secs[i] }))
      .concat({ beat: song.end, sec: secs[4] });
    expect(Object.fromEntries(barTemposFromMarks(song, marks))).toEqual({ 1: 80, 2: 120, 3: 100 });

    const out = applyBarMarksToMusicXml(REPEAT_SCORE, song, marks, parseXml, serializeXml);
    const again = parseMusicXml(out, 't.musicxml', parseXml);
    expect(again.tempoMap).toEqual([
      { beat: 0, bpm: 80 },
      { beat: 4, bpm: 120 },
      { beat: 8, bpm: 80 },
      { beat: 12, bpm: 100 },
    ]);
    expect(readAudioOffset(out)).toBeCloseTo(0.75);
    expect(again.parts.map((p) => p.notes.length)).toEqual(song.parts.map((p) => p.notes.length));
  });
});

describe('instruments', () => {
  it('guesses families from names, programs and lyrics', () => {
    expect(guessInstrument('Alto Flute', 73, false, false)).toBe('melody');
    expect(guessInstrument('Bass', null, false, false)).toBe('bass');
    expect(guessInstrument('Track 1', 26, false, false)).toBe('guitar');
    expect(guessInstrument('Track 2', null, false, true)).toBe('vocals');
    expect(guessInstrument('Anything', null, true, false)).toBe('drums');
  });

  it('maps GM drum keys to lanes', () => {
    expect([36, 38, 42, 45, 49].map(drumLaneOf)).toEqual([4, 2, 1, 3, 0]);
    expect(drumLaneOf(58)).toBe(3); // Roland tom 3 rim
  });

  it('gives chord notes distinct strings and keeps frets in reach', () => {
    const guitar = STRING_TUNINGS.guitar!;
    const chord = [52, 59, 64].map((pitch) => ({ t: 0, dur: 1, pitch }));
    const tabbed = assignTab(chord, guitar);
    expect(new Set(tabbed.map((n) => n.lane)).size).toBe(3);
    for (const n of tabbed) expect(guitar.tuning[n.lane] + n.fret).toBe(n.pitch);
  });

  it('keeps written tab positions that fit the tuning', () => {
    const guitar = STRING_TUNINGS.guitar!;
    const tabbed = assignTab(
      [
        { t: 0, dur: 1, pitch: 67, tab: { string: 1, fret: 8 } },
        { t: 0, dur: 1, pitch: 64, tab: { string: 2, fret: 9 } },
        { t: 0, dur: 1, pitch: 45, tab: { string: 4, fret: 0 } },
        // written for another tuning: placed by the heuristic instead
        { t: 1, dur: 1, pitch: 64, tab: { string: 1, fret: 3 } },
        // above maxFret, still as written
        { t: 2, dur: 1, pitch: 83, tab: { string: 0, fret: 19 } },
      ],
      guitar,
    );
    expect(tabbed.map((n) => [n.t, n.lane, n.fret, n.pitch])).toEqual([
      [0, 1, 8, 67],
      [0, 2, 9, 64],
      [0, 4, 0, 45],
      [1, 0, 0, 64],
      [2, 0, 19, 83],
    ]);
  });

  it('reduces chords to their top line', () => {
    expect(
      topLine([
        { t: 0, dur: 1, pitch: 60 },
        { t: 0, dur: 1, pitch: 67 },
        { t: 1, dur: 1, pitch: 62 },
      ]).map((n) => n.pitch),
    ).toEqual([67, 62]);
  });
});
