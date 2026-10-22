import type {
  AudioMap,
  InstrumentKind,
  ScorePart,
  ScoreSong,
} from '../../../../modules/music-score';
import type { PitchRange, StageNote, Judgement } from '../logic/charts';
import type { StageInstrument } from '../logic/instruments';
import type { PlayerStats } from '../logic/judging';

export type StageMode = 'learn' | 'practice' | 'perform';
export type PlayState = 'idle' | 'playing' | 'paused' | 'done';
/** play: a person plays this part on this screen; band: it is heard; off: muted. */
export type TrackRole = 'play' | 'band' | 'off';

export interface TrackSetup {
  inst: InstrumentKind;
  role: TrackRole;
  /** Order of players on screen (lower first). */
  rank: number;
}

export interface FxEvent {
  kind: Judgement | 'wrong';
  note: StageNote;
  /** Lane that was played (differs from the note's lane for a wrong note). */
  lane: number;
}

export interface StagePlayer {
  no: number;
  part: ScorePart;
  instrument: StageInstrument;
  notes: StageNote[];
  range: PitchRange;
  /** C of the octave the computer keyboard (A–K) plays on the keys view. */
  octaveBase: number;
  maxDur: number;
  stats: PlayerStats;
  pending: StageNote[];
  missIdx: number;
  /** Judgements since the renderer last looked; it drains this list. */
  fx: FxEvent[];
  /** Lanes recently played, for key/string/pad flashes. */
  pressed: Set<number>;
  /** Recent sung pitch per beat (pitch view). */
  history: { beat: number; pitch: number | null }[];
  voice: { pitch: number; singing: boolean };
}

/** Sound output the engine drives; the browser implementation wraps an AudioContext. */
export interface StageSound {
  /** Seconds on the audio clock. */
  now(): number;
  playNote(inst: InstrumentKind, midi: number, durationSec: number, volume: number): void;
  playDrum(lane: number, volume: number): void;
  click(accent: boolean): void;
  stopAll(): void;
}

/** A recording that replaces the synthesised band, mapped to the score by bar marks. */
export interface StageRecording {
  map: AudioMap;
  duration: number;
  time(): number;
  isPlaying(): boolean;
  play(fromSec: number, rate: number): void;
  pause(): void;
  setRate(rate: number): void;
  setVolume(volume: number): void;
}

export interface BandEvent {
  t: number;
  kind: 'click' | 'note' | 'drum';
  inst?: InstrumentKind;
  midi?: number;
  dur?: number;
  lane?: number;
  accent?: boolean;
}

export interface PlayerResult {
  no: number;
  partName: string;
  inst: InstrumentKind;
  accuracy: number;
  stars: number;
  score: number;
  maxCombo: number;
}

export type { ScoreSong };
