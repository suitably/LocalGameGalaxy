import type { InstrumentKind, ScoreNote } from './types';

export interface StringTuning {
  /** String names from the highest (top line of a tab) to the lowest. */
  strings: string[];
  /** Open-string MIDI pitches in the same order. */
  tuning: number[];
  maxFret: number;
}

export const STRING_TUNINGS: Partial<Record<InstrumentKind, StringTuning>> = {
  guitar: {
    strings: ['e', 'B', 'G', 'D', 'A', 'E'],
    tuning: [64, 59, 55, 50, 45, 40],
    maxFret: 17,
  },
  bass: { strings: ['G', 'D', 'A', 'E'], tuning: [43, 38, 33, 28], maxFret: 17 },
  ukulele: { strings: ['A', 'E', 'C', 'G'], tuning: [69, 64, 60, 67], maxFret: 12 },
};

/** Drum lanes on the stage, left to right; the kick is drawn as a bar across all lanes. */
export const DRUM_LANES = ['cymbal', 'hihat', 'snare', 'tom', 'kick'] as const;
export type DrumLane = (typeof DRUM_LANES)[number];

/** Maps a General MIDI percussion key to a stage lane index (see DRUM_LANES). */
export function drumLaneOf(midiKey: number): number {
  if (midiKey === 35 || midiKey === 36) return 4;
  if (midiKey >= 37 && midiKey <= 40) return 2;
  // 58: Roland V-Drums tom 3 rim (GM vibraslap, never written for a kit)
  if ([41, 43, 45, 47, 48, 50, 58].includes(midiKey)) return 3;
  if ([49, 51, 52, 53, 55, 57, 59].includes(midiKey)) return 0;
  return 1;
}

const NAME_RULES: Array<[RegExp, InstrumentKind]> = [
  [/drum|schlagzeug|percussion/, 'drums'],
  [/ukul/, 'ukulele'],
  [
    /flute|flöte|violin|geige|viola|cello|sax|trumpet|trompete|clarinet|klarinette|oboe|horn|string|streicher/,
    'melody',
  ],
  [/bass/, 'bass'],
  [/guit|gitarr/, 'guitar'],
  [/voc|voice|gesang|stimme|sing|sopran|tenor|choir|chor/, 'vocals'],
  [/piano|klavier|keys|keyboard|organ|orgel|synth/, 'keyboard'],
];

/** Best guess of the instrument family from part name, GM program and content. */
export function guessInstrument(
  name: string,
  program: number | null,
  isDrum: boolean,
  hasLyrics: boolean,
): InstrumentKind {
  if (isDrum) return 'drums';
  const n = name.toLowerCase();
  for (const [re, kind] of NAME_RULES) {
    if (re.test(n)) return kind;
  }
  if (hasLyrics) return 'vocals';
  if (program !== null) {
    if (program <= 23) return 'keyboard';
    if (program <= 31) return 'guitar';
    if (program <= 39) return 'bass';
    if (program >= 52 && program <= 54) return 'vocals';
  }
  return 'melody';
}

export interface TabbedNote extends ScoreNote {
  /** String index into StringTuning.strings. */
  lane: number;
  fret: number;
}

/**
 * Picks string and fret for every note: chords get distinct strings, and the
 * hand position drifts smoothly instead of jumping along the neck.
 * Notes outside the range are moved by octaves; notes that do not fit a chord are dropped.
 */
export function assignTab(notes: ScoreNote[], tuning: StringTuning): TabbedNote[] {
  const low = Math.min(...tuning.tuning);
  const high = Math.max(...tuning.tuning) + tuning.maxFret;
  const out: TabbedNote[] = [];
  let hand = 3;
  let i = 0;
  while (i < notes.length) {
    let j = i;
    while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 1e-6) j++;
    const chord = notes.slice(i, j).sort((a, b) => b.pitch - a.pitch);
    const used = new Set<number>();
    const frets: number[] = [];
    for (const n of chord) {
      let pitch = n.pitch;
      while (pitch < low) pitch += 12;
      while (pitch > high) pitch -= 12;
      let best: { lane: number; fret: number } | null = null as {
        lane: number;
        fret: number;
      } | null;
      let bestCost = Infinity;
      for (let lane = 0; lane < tuning.tuning.length; lane++) {
        const fret = pitch - tuning.tuning[lane];
        if (used.has(lane) || fret < 0 || fret > tuning.maxFret) continue;
        const stretch = fret > hand + 4 ? (fret - hand - 4) * 2 : 0;
        const cost = fret === 0 ? 0.6 : Math.abs(fret - hand) + stretch;
        if (cost < bestCost) {
          bestCost = cost;
          best = { lane, fret };
        }
      }
      if (best === null) continue;
      const { lane, fret } = best;
      used.add(lane);
      if (fret > 0) frets.push(fret);
      out.push({ ...n, pitch, lane, fret });
    }
    if (frets.length) hand = hand * 0.4 + (frets.reduce((a, b) => a + b, 0) / frets.length) * 0.6;
    i = j;
  }
  return out;
}

/** Keeps the highest note per onset so a monophonic part (voice, flute) can be sung or played. */
export function topLine(notes: ScoreNote[]): ScoreNote[] {
  const byOnset = new Map<number, ScoreNote>();
  for (const n of notes) {
    const key = Math.round(n.t * 1000);
    const prev = byOnset.get(key);
    if (!prev || n.pitch > prev.pitch) byOnset.set(key, n);
  }
  return Array.from(byOnset.values()).sort((a, b) => a.t - b.t);
}
