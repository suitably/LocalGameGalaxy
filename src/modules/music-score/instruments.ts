import { drumVoiceOfKey, type DrumVoice } from './drumVoices';
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

/**
 * Drum lanes on the stage, left to right in kit order (#571, ADR-0007); the kick is drawn as a bar
 * across all lanes. A stage shows only the lanes a song uses.
 */
export const DRUM_LANES = [
  'cymbal',
  'hihat',
  'snare',
  'tom1',
  'tom2',
  'tom3',
  'floorTom',
  'percussion',
  'kick',
] as const;
export type DrumLane = (typeof DRUM_LANES)[number];

export const DRUM_TOM_LANES: readonly number[] = [3, 4, 5, 6];
/** Tambourine, cowbell, clap and every other non-kit sound; judged only when the player wants it. */
export const DRUM_PERCUSSION_LANE = 7;
export const DRUM_KICK_LANE = 8;

const VOICE_LANE: Record<DrumVoice, number> = {
  crash: 0,
  ride: 0,
  rideBell: 0,
  china: 0,
  splash: 0,
  hihatClosed: 1,
  hihatOpen: 1,
  hihatPedal: 1,
  snare: 2,
  snareRimshot: 2,
  snareCrossStick: 2,
  snareGhost: 2,
  tom1: 3,
  tom2: 4,
  tom3: 5,
  floorTom: 6,
  cowbell: DRUM_PERCUSSION_LANE,
  tambourine: DRUM_PERCUSSION_LANE,
  other: DRUM_PERCUSSION_LANE,
  kick: DRUM_KICK_LANE,
};

/** Stage lane index (see DRUM_LANES) of a drum voice; non-kit voices go to the percussion lane. */
export const drumLaneOfVoice = (voice: DrumVoice): number => VOICE_LANE[voice];

/**
 * E-drum keys outside General MIDI that kits send for kit pieces (Roland V-Drums: 22/26 hi-hat
 * edge closed/open, 58 tom 3 rim, which GM calls vibraslap and no kit score writes).
 */
const KIT_KEY_LANES: Record<number, number> = { 22: 1, 26: 1, 58: 6 };

/** Maps a General MIDI percussion key to a stage lane index (see DRUM_LANES); unknown keys are percussion. */
export function drumLaneOf(midiKey: number): number {
  return KIT_KEY_LANES[midiKey] ?? drumLaneOfVoice(drumVoiceOfKey(midiKey));
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

/**
 * Every instrument family a name mentions, most specific first ("Piano Vocal" names two).
 * A bass guitar is a bass, not also a guitar.
 */
export function instrumentsInName(name: string): InstrumentKind[] {
  const n = name.toLowerCase().replace(/bass\s*-?\s*(guitar|gitarre)|e-bass/g, 'bass');
  return NAME_RULES.filter(([re]) => re.test(n)).map(([, kind]) => kind);
}

/** Best guess of the instrument family from part name, GM program and content. */
export function guessInstrument(
  name: string,
  program: number | null,
  isDrum: boolean,
  hasLyrics: boolean,
): InstrumentKind {
  if (isDrum) return 'drums';
  const [named] = instrumentsInName(name);
  if (named) return named;
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
 * Picks string and fret for every note. A position the score writes (Guitar Pro) is kept when it
 * fits the tuning; otherwise chords get distinct strings, and the hand position drifts smoothly
 * instead of jumping along the neck.
 * Notes outside the range are moved by octaves; notes that do not fit a chord are dropped.
 */
export function assignTab(notes: ScoreNote[], tuning: StringTuning): TabbedNote[] {
  const low = Math.min(...tuning.tuning);
  const high = Math.max(...tuning.tuning) + tuning.maxFret;
  const written = (n: ScoreNote) =>
    n.tab && n.tab.fret >= 0 && tuning.tuning[n.tab.string] + n.tab.fret === n.pitch ? n.tab : null;
  const out: TabbedNote[] = [];
  let hand = 3;
  let i = 0;
  while (i < notes.length) {
    let j = i;
    while (j < notes.length && Math.abs(notes[j].t - notes[i].t) < 1e-6) j++;
    // written positions claim their strings first
    const chord = notes
      .slice(i, j)
      .sort((a, b) => Number(!!written(b)) - Number(!!written(a)) || b.pitch - a.pitch);
    const used = new Set<number>();
    const frets: number[] = [];
    for (const n of chord) {
      const tab = written(n);
      if (tab && !used.has(tab.string)) {
        used.add(tab.string);
        if (tab.fret > 0) frets.push(tab.fret);
        out.push({ ...n, lane: tab.string, fret: tab.fret });
        continue;
      }
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
