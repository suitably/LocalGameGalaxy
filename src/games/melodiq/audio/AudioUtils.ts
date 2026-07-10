/**
 * Web Audio API Pitch Detection Utilities
 *
 * Pure signal-processing functions for real-time pitch detection from a microphone
 * `AnalyserNode`. These utilities form the core of Melodiq's scoring engine.
 *
 * ## Algorithm Overview
 * 1. **RMS (Root Mean Square)**: Measures signal volume. Used as a gate to avoid
 *    detecting pitch in silence.
 * 2. **Autocorrelation**: Computes the lag at which the waveform best repeats
 *    itself. The period `T0` corresponds to the fundamental frequency `f = sampleRate / T0`.
 * 3. **Parabolic Interpolation**: Refines the integer-lag autocorrelation peak
 *    to sub-sample accuracy, reducing frequency estimation error.
 * 4. **MIDI Conversion**: Maps Hz to a MIDI note number for comparison against
 *    the UltraStar note pitch values.
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
 * Used as a volume gate: if RMS is below a threshold (typically 0.01),
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
 * Detects the fundamental frequency of a PCM audio buffer using autocorrelation
 * with parabolic interpolation for sub-sample accuracy.
 *
 * **Algorithm**:
 * 1. Rejects frames with RMS below 0.01 (silence gate).
 * 2. Trims the buffer to the region of meaningful signal (removes leading/trailing
 *    samples below 0.2 threshold amplitude).
 * 3. Computes the normalized autocorrelation function `c[lag]`.
 * 4. Finds the first local maximum of `c` after the initial descent (`d`),
 *    corresponding to the period of the fundamental.
 * 5. Applies parabolic interpolation around the peak for sub-sample precision.
 * 6. Returns `sampleRate / T0` as the frequency in Hz.
 *
 * @param buffer - Float32Array of PCM samples (typically 2048 samples from AnalyserNode).
 * @param sampleRate - The AudioContext sample rate in Hz (e.g., 44100, 48000).
 * @returns Detected frequency in Hz, or `-1` if the signal is too quiet or unpitched.
 */
export const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    let sumOfSquares = 0;
    for (let i = 0; i < SIZE; i++) {
        const val = buffer[i];
        sumOfSquares += val * val;
    }

    const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
    if (rootMeanSquare < 0.01) {
        return -1; // Not enough signal
    }

    let r1 = 0;
    let r2 = SIZE - 1;
    const threshold = 0.2;

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

    const trimmedBuffer = buffer.slice(r1, r2);
    const c = new Array(trimmedBuffer.length).fill(0);

    for (let i = 0; i < trimmedBuffer.length; i++) {
        for (let j = 0; j < trimmedBuffer.length - i; j++) {
            c[i] = c[i] + trimmedBuffer[j] * trimmedBuffer[j + i];
        }
    }

    // Find start of first peak (skip initial descent)
    let d = 0;
    while (c[d] > c[d + 1]) d++;

    let maxval = -1;
    let maxpos = -1;

    for (let i = d; i < c.length; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }

    let T0 = maxpos;

    // Parabolic interpolation for sub-sample accuracy
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
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
    // MIDI note conversion: Note = 69 + 12 * log2(freq / 440)
    return 69 + 12 * Math.log2(frequency / 440);
};
