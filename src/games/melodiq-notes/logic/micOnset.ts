/**
 * Microphone onset detection for played instruments (guitar, ukulele, piano into the mic).
 *
 * Pure and frame based: the hook polls the microphone every few tens of milliseconds and feeds
 * one {@link MicFrame} per poll. A note starts (an onset) when
 * - the signal rises out of silence (RMS gate with hysteresis),
 * - the energy jumps while a string still rings (a re-plucked string: repeated notes register), or
 * - the pitch moves to another semitone while the sound goes on (legato, slides).
 * An attack often has no clear pitch yet; the onset then waits a few frames for one.
 */

/** One microphone poll: loudness and the detected pitch (fractional MIDI, null when unpitched). */
export interface MicFrame {
  rms: number;
  pitch: number | null;
}

export interface MicOnsetState {
  sounding: boolean;
  /** RMS of the last two frames, newest last (baseline for an energy jump). */
  recent: number[];
  /** Frames since the last onset (Infinity before the first one). */
  sinceOnset: number;
  /** Pitch of the last onset; a new semitone while sounding is a new note. */
  onsetPitch: number | null;
  /** Frames an unpitched onset still waits for a pitch (0: none waiting). */
  pending: number;
}

export interface MicOnsetResult {
  state: MicOnsetState;
  /** The pitch heard now while the gate is open (fractional MIDI), else null. */
  pitch: number | null;
  /** Fractional MIDI pitch of a note that started in this frame, else null. */
  onset: number | null;
}

/** Gate opens above this RMS (≈ −34 dBFS) … */
export const GATE_ON_RMS = 0.02;
/** … and closes below this one (MicrophoneManager's own silence gate). */
export const GATE_OFF_RMS = 0.01;
/**
 * A frame this many times louder than the quieter of the last two frames is a new attack (≈ +2 dB).
 * A guitar string decays ~15 dB/s; an equally strong re-pluck an eighth note later (0.3 s at
 * 100 bpm) measures at least 1.27× in 80 ms polls, whatever the pluck's phase within a poll (a
 * frame straddling the attack splits the jump). A ringing note only gets quieter.
 */
export const RISE_RATIO = 1.25;
/** An energy jump right after an onset belongs to the same attack (a frame straddling it). */
export const RISE_REFRACTORY_FRAMES = 2;
/** Semitones the pitch must move from the onset's pitch to count as a new note while sounding. */
export const PITCH_CHANGE_SEMITONES = 0.6;
/** Frames an attack without a clear pitch waits for one before it is dropped. */
export const PENDING_FRAMES = 2;

export const initialMicOnsetState = (): MicOnsetState => ({
  sounding: false,
  recent: [],
  sinceOnset: Infinity,
  onsetPitch: null,
  pending: 0,
});

/** Feeds one frame; returns the next state, the heard pitch and an onset, if one started now. */
export function nextMicFrame(state: MicOnsetState, frame: MicFrame): MicOnsetResult {
  const { rms } = frame;
  const sounding = state.sounding ? rms >= GATE_OFF_RMS : rms >= GATE_ON_RMS;
  const recent = [...state.recent, rms].slice(-2);
  if (!sounding) {
    return {
      state: { ...initialMicOnsetState(), recent, sinceOnset: state.sinceOnset + 1 },
      pitch: null,
      onset: null,
    };
  }
  const pitch = frame.pitch;
  const baseline = state.recent.length ? Math.min(...state.recent) : 0;
  const attack =
    !state.sounding || (state.sinceOnset >= RISE_REFRACTORY_FRAMES && rms >= baseline * RISE_RATIO);
  const moved =
    pitch !== null &&
    state.onsetPitch !== null &&
    Math.round(pitch) !== Math.round(state.onsetPitch) &&
    Math.abs(pitch - state.onsetPitch) >= PITCH_CHANGE_SEMITONES;
  // a pitched sound that follows an unpitched attack, or a sound whose first onset was dropped
  const waited = pitch !== null && (state.pending > 0 || state.onsetPitch === null);
  const fires = pitch !== null && (attack || moved || waited);
  const next: MicOnsetState = {
    sounding,
    recent,
    sinceOnset: fires ? 0 : state.sinceOnset + 1,
    onsetPitch: fires ? pitch : state.onsetPitch,
    pending: fires ? 0 : attack ? PENDING_FRAMES : Math.max(0, state.pending - 1),
  };
  return { state: next, pitch, onset: fires ? pitch : null };
}
