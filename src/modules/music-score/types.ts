import type { DrumVoice, Hand } from './drumVoices';

/** Instrument families the stage can render and score. */
export type InstrumentKind =
  'keyboard' | 'guitar' | 'bass' | 'ukulele' | 'drums' | 'vocals' | 'melody';

/** One sounding note in a part. Times are in quarter-note beats from the start of bar 1. */
export interface ScoreNote {
  t: number;
  dur: number;
  /** Sounding MIDI pitch; for drums the General MIDI percussion key. */
  pitch: number;
  /** Lyric syllable; a trailing '-' means the word continues. */
  syl?: string;
  /** Drum parts: the written instrument and articulation; derive it from `pitch` when absent. */
  drum?: DrumVoice;
  /** Drum parts: sticking (R/L) when the score has it. */
  hand?: Hand;
  /** Written accent (`>` or `^`). */
  accent?: boolean;
  /** Drum parts: a grace stroke on the same drum just before (flam). */
  flam?: boolean;
}

export interface ScorePart {
  id: string;
  name: string;
  notes: ScoreNote[];
  isDrum: boolean;
  /** General MIDI program (0-based) when the source names one. */
  program: number | null;
  guess: InstrumentKind;
}

export interface TempoEvent {
  beat: number;
  bpm: number;
}

/**
 * A playable song: all parts share one timeline (bars, tempo, repeats already
 * written out), so any subset can be played together.
 */
export interface ScoreSong {
  title: string;
  artist: string;
  /** File name the song was read from. */
  source: string;
  tempoMap: TempoEvent[];
  /** Start beat of every played bar, in play order. */
  measureStarts: number[];
  measureLengths: number[];
  /** Written bar number (1-based) of every played bar, so repeats map back to the score. */
  measureNumbers: number[];
  end: number;
  parts: ScorePart[];
}

/** Where a score beat sits in a recording, one mark per bar (plus one at the end). */
export interface BarMark {
  beat: number;
  sec: number;
}

/** Parses an XML string; injected so the same code runs in the browser and in Node tests. */
export type XmlParser = (text: string) => Document;
