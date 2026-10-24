import type { Note } from '../../parser';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Translates a MIDI note number into a notation label (e.g. C4). */
export const getNoteName = (midiNote: number): string => {
  const note = Math.round(midiNote);
  const octave = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[((note % 12) + 12) % 12]}${octave}`;
};

/** Line breaks, rap and golden-rap notes carry no melody pitch. */
export const isMelodyNote = (n: Pick<Note, 'type'>): boolean =>
  n.type !== '-' && n.type !== 'R' && n.type !== 'G';

export interface PitchLayout {
  centerPitch: number;
  noteHeight: number;
}

const DEFAULT_LAYOUT: PitchLayout = { centerPitch: 60, noteHeight: 18 };

/** Vertical layout so the whole pitch range of a track fits the canvas (2 semitones of padding each side). */
export const computePitchLayout = (
  notes: readonly Note[],
  availableHeight: number,
  scale: number,
): PitchLayout => {
  let min = Infinity;
  let max = -Infinity;
  for (const n of notes) {
    if (!isMelodyNote(n)) continue;
    if (n.pitch < min) min = n.pitch;
    if (n.pitch > max) max = n.pitch;
  }
  if (min === Infinity) return DEFAULT_LAYOUT;

  const range = max - min + 4;
  return {
    centerPitch: (min + max) / 2,
    noteHeight: Math.min(30 * scale, availableHeight / range),
  };
};

/**
 * Pitch the singer's cursor should be folded towards: the active note, else a note
 * starting within the next 4 beats, else the track centre.
 */
export const octaveTargetPitch = (
  notes: readonly Note[],
  currentBeat: number,
  centerPitch: number,
): number => {
  const active = notes.find(
    (n) => isMelodyNote(n) && n.start <= currentBeat && n.start + n.duration >= currentBeat,
  );
  if (active) return active.pitch;
  const future = notes.find(
    (n) => isMelodyNote(n) && n.start > currentBeat && n.start < currentBeat + 4,
  );
  return future ? future.pitch : centerPitch;
};

/**
 * Octave shift (in semitones) applied to the sung pitch so it lands near the target.
 * The previous shift is kept unless the ideal one is clearly better (hysteresis of 3 semitones).
 */
export const nextOctaveShift = (
  sungPitch: number,
  targetPitch: number,
  currentShift: number,
): number => {
  const idealShift = Math.round((targetPitch - sungPitch) / 12) * 12;
  const errorCurrent = Math.abs(targetPitch - (sungPitch + currentShift));
  const errorIdeal = Math.abs(targetPitch - (sungPitch + idealShift));
  return errorCurrent - errorIdeal > 3 ? idealShift : currentShift;
};

export const CURSOR_FADE_MS = 300;

export interface DisplayedPitch {
  pitch: number | null;
  alpha: number;
}

/** Pitch cursor to show: the live pitch, or the last valid one fading out over 300 ms. */
export const resolveDisplayedPitch = (
  livePitch: number,
  lastValidPitch: number,
  msSinceValid: number,
  isPaused: boolean,
): DisplayedPitch => {
  if (!isPaused && livePitch > 0) return { pitch: livePitch, alpha: 1 };
  if (!isPaused && msSinceValid < CURSOR_FADE_MS && lastValidPitch > 0) {
    return { pitch: lastValidPitch, alpha: Math.max(0, 1 - msSinceValid / CURSOR_FADE_MS) };
  }
  return { pitch: null, alpha: 0 };
};

export interface AudioClock {
  lastAudioTime: number;
  lastRealTime: number;
}

/**
 * Smooth song time: audio `currentTime` only updates a few times per second, so between
 * updates it is extrapolated from the wall clock (at most 0.3 s ahead of the last raw value).
 */
export const interpolateAudioTime = (
  clock: AudioClock,
  rawTime: number,
  stopped: boolean,
  now: number,
): { time: number; clock: AudioClock } => {
  if (stopped || rawTime !== clock.lastAudioTime) {
    return { time: rawTime, clock: { lastAudioTime: rawTime, lastRealTime: now } };
  }
  return {
    time: Math.min(rawTime + 0.3, clock.lastAudioTime + (now - clock.lastRealTime) / 1000),
    clock,
  };
};
