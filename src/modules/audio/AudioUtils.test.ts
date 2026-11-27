import { describe, expect, it } from 'vitest';
import { autoCorrelate, computeRMS, freqToMidi, MIN_PITCH_RMS } from './AudioUtils';

const SAMPLE_RATE = 48000;
const SIZE = 2048;

/** A sung-like tone: fundamental plus two weaker harmonics. */
const voice = (freq: number, amplitude: number): Float32Array => {
  const buf = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const t = i / SAMPLE_RATE;
    buf[i] =
      amplitude *
      (Math.sin(2 * Math.PI * freq * t) +
        0.5 * Math.sin(2 * Math.PI * 2 * freq * t) +
        0.25 * Math.sin(2 * Math.PI * 3 * freq * t));
  }
  return buf;
};

/** Deterministic white noise (LCG). */
const noise = (amplitude: number): Float32Array => {
  const buf = new Float32Array(SIZE);
  let seed = 12345;
  for (let i = 0; i < SIZE; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    buf[i] = amplitude * ((seed / 2147483648) * 2 - 1);
  }
  return buf;
};

const semitonesOff = (detected: number, expected: number) =>
  Math.abs(freqToMidi(detected) - freqToMidi(expected));

describe('autoCorrelate', () => {
  it.each([55, 110, 220, 440, 880, 2000])('detects a loud %d Hz voice', (freq) => {
    const f = autoCorrelate(voice(freq, 0.3), SAMPLE_RATE);
    expect(semitonesOff(f, freq)).toBeLessThan(0.2);
  });

  it('detects a quiet phone-level voice that the old 0.01 gate dropped', () => {
    const buf = voice(330, 0.006);
    expect(computeRMS(buf)).toBeLessThan(0.01);
    expect(computeRMS(buf)).toBeGreaterThan(MIN_PITCH_RMS);
    expect(semitonesOff(autoCorrelate(buf, SAMPLE_RATE), 330)).toBeLessThan(0.2);
  });

  it('gives the same pitch for quiet and loud input', () => {
    const quiet = autoCorrelate(voice(196, 0.005), SAMPLE_RATE);
    const loud = autoCorrelate(voice(196, 0.4), SAMPLE_RATE);
    expect(Math.abs(quiet - loud)).toBeLessThan(1);
  });

  it('rejects silence and noise', () => {
    expect(autoCorrelate(new Float32Array(SIZE), SAMPLE_RATE)).toBe(-1);
    expect(autoCorrelate(voice(440, 0.001), SAMPLE_RATE)).toBe(-1);
    expect(autoCorrelate(noise(0.2), SAMPLE_RATE)).toBe(-1);
  });
});
