/**
 * Web Audio API Pitch Detection Utilities
 *
 * Pure signal-processing functions for real-time pitch detection from a microphone
 * `AnalyserNode`.
 *
 * ## Algorithm Overview
 * 1. **RMS (Root Mean Square)**: Measures signal volume. Used as a gate to avoid
 *    detecting pitch in silence.
 * 2. **Autocorrelation**: Computes the lag at which the waveform best repeats
 *    itself. The period `T0` corresponds to the fundamental frequency `f = sampleRate / T0`.
 * 3. **Parabolic Interpolation**: Refines the integer-lag autocorrelation peak
 *    to sub-sample accuracy, reducing frequency estimation error.
 * 4. **MIDI Conversion**: Maps Hz to a MIDI note number.
 */

/** Result of a single pitch detection frame. */
export interface PitchResult {
  /** Detected fundamental frequency in Hz. */
  frequency: number;
  /** Equivalent MIDI note number (float; 69 = A4 = 440 Hz). */
  note: number;
  /** Approximate signal amplitude (0.0 to 1.0 RMS). */
  volume: number;
}

/**
 * Computes the Root Mean Square (RMS) amplitude of a PCM audio buffer.
 *
 * Used as a volume gate: if RMS is below `MIN_PITCH_RMS`,
 * the signal is too quiet to detect pitch reliably.
 *
 * @param buffer - Float32Array of PCM samples in the range [-1.0, 1.0].
 * @returns RMS value in the range [0.0, ~1.0].
 */
export const computeRMS = (buffer: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
};

/**
 * Silence gate (RMS). Phone microphones run without automatic gain control here, so singing
 * at arm's length often stays well below 0.01; a frame this quiet is still analysed, and the
 * clarity check below rejects noise instead.
 */
export const MIN_PITCH_RMS = 0.003;
/** Lowest / highest detected fundamental: voices, and instruments in Melodiq Notes (bass E1 to piano C8). */
const MIN_FREQUENCY_HZ = 40;
const MAX_FREQUENCY_HZ = 4200;
/** Normalized autocorrelation at the period needed to count as a pitched (voiced) frame. */
const MIN_CLARITY = 0.5;

/**
 * Detects the fundamental frequency of a PCM audio buffer using autocorrelation
 * with parabolic interpolation for sub-sample accuracy.
 *
 * **Algorithm**:
 * 1. Rejects frames with RMS below `MIN_PITCH_RMS` (silence gate).
 * 2. Trims leading/trailing samples above 20 % of the frame's own peak, so quiet and loud
 *    signals are treated alike (the volume of a microphone does not change the result).
 * 3. Computes the autocorrelation `c[lag]` for lags up to the period of `MIN_FREQUENCY_HZ`.
 * 4. Finds the highest peak of `c` after the initial descent (`d`): the fundamental's period.
 * 5. Rejects the frame when that peak is weak relative to `c[0]` (noise, breath, consonants).
 * 6. Applies parabolic interpolation around the peak and returns `sampleRate / T0` in Hz.
 *
 * @param buffer - Float32Array of PCM samples (typically 2048 samples from AnalyserNode).
 * @param sampleRate - The AudioContext sample rate in Hz (e.g., 44100, 48000).
 * @returns Detected frequency in Hz, or `-1` if the signal is too quiet or unpitched.
 */
export const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  let peak = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    sumOfSquares += val * val;
    const abs = Math.abs(val);
    if (abs > peak) peak = abs;
  }

  const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
  if (rootMeanSquare < MIN_PITCH_RMS) {
    return -1; // Not enough signal
  }

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2 * peak;

  // Trim buffer to meaningful signal start/end
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  const n = trimmed.length;
  // Longer lags than the lowest note's period are never the answer: skip them (CPU on phones)
  const maxLag = Math.min(n - 2, Math.ceil(sampleRate / MIN_FREQUENCY_HZ));
  if (maxLag < 2) return -1;
  const c = new Float64Array(maxLag + 2);
  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let sum = 0;
    for (let j = 0; j < n - lag; j++) sum += trimmed[j] * trimmed[j + lag];
    c[lag] = sum;
  }
  if (c[0] <= 0) return -1;

  // Find start of first peak (skip initial descent)
  let d = 0;
  while (d < maxLag && c[d] > c[d + 1]) d++;

  let maxval = -Infinity;
  let maxpos = -1;
  for (let i = Math.max(d, 1); i <= maxLag; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos < 1) return -1;

  // Normalized by the overlap length, so long periods (low notes) are not penalized
  const clarity = (maxval / c[0]) * (n / (n - maxpos));
  if (clarity < MIN_CLARITY) return -1;

  let T0 = maxpos;

  // Parabolic interpolation for sub-sample accuracy
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const frequency = sampleRate / T0;
  if (!Number.isFinite(frequency) || frequency < MIN_FREQUENCY_HZ || frequency > MAX_FREQUENCY_HZ) {
    return -1;
  }
  return frequency;
};

/**
 * Converts a frequency in Hz to a MIDI note number.
 *
 * Uses the standard formula: `MIDI = 69 + 12 * log2(freq / 440)`
 * where MIDI 69 = A4 = 440 Hz.
 *
 * The result is a float; use `Math.round()` to get the nearest semitone.
 *
 * @param frequency - Frequency in Hz (must be > 0).
 * @returns MIDI note number as a float.
 */
export const freqToMidi = (frequency: number): number => {
  return 69 + 12 * Math.log2(frequency / 440);
};
