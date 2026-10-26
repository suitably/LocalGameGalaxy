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
/** One person on this screen: the part they play and the instrument it is shown as. */
export interface PlayerSeat {
  partId: string;
  inst: InstrumentKind;
  /** Set when the player plays on their own device (a pult) instead of this screen. */
  remoteId?: string;
  /** The pult's player name. */
  name?: string;
}

/**
 * What the synth plays besides the players when there is no recording:
 * every part (the players' too, as a guide), only the parts nobody plays, or nothing.
 */
export type BandMode = 'all' | 'others' | 'none';

export interface FxEvent {
  kind: Judgement | 'wrong';
  note: StageNote;
  /** Lane that was played (differs from the note's lane for a wrong note). */
  lane: number;
}

export interface StagePlayer {
  no: number;
  /** Pult id when this player plays on their own device; the pult judges them, not the stage. */
  remoteId?: string;
  name?: string;
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
  /** First beat the recording has (bars before it are an intro it lacks and are not played); 0 when absent. */
  startBeat?: number;
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
