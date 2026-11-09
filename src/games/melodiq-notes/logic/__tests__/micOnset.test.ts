import { describe, it, expect } from 'vitest';
import { autoCorrelate, computeRMS, freqToMidi } from '../../../../modules/audio';
import { centsOff } from '../../stage/logic/judging';
import { initialMicOnsetState, nextMicFrame, type MicFrame } from '../micOnset';

// Synthetic microphone: what MicrophoneManager hands the hook every 80 ms (2048-sample frames).
const SR = 48000;
const FRAME = 2048;
const POLL_SEC = 0.08;
const midiHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * A plucked string: three harmonics, fast attack, exponential decay (1.7/s ≈ 15 dB/s, a guitar).
 * `until`: the string is damped (re-plucked strings restart, they do not add up).
 */
interface Pluck {
  at: number;
  midi: number;
  amp?: number;
  decay?: number;
  until?: number;
}
const sampleAt = (plucks: Pluck[], t: number) => {
  let v = 0;
  for (const { at, midi, amp = 0.5, decay = 1.7, until = Infinity } of plucks) {
    const dt = t - at;
    if (dt < 0 || t >= until) continue;
    const env = amp * Math.min(1, dt / 0.005) * Math.exp(-decay * dt);
    const f = midiHz(midi);
    for (const [h, w] of [
      [1, 1],
      [2, 0.4],
      [3, 0.2],
    ])
      v += env * w * Math.sin(2 * Math.PI * f * h * dt);
  }
  return v / 1.6;
};

/** Frames as the hook measures them: RMS gate and the shared autocorrelation pitch. */
function frames(plucks: Pluck[], seconds: number): MicFrame[] {
  const out: MicFrame[] = [];
  for (let end = POLL_SEC; end <= seconds; end += POLL_SEC) {
    const buf = new Float32Array(FRAME);
    const start = end * SR - FRAME;
    for (let i = 0; i < FRAME; i++) buf[i] = sampleAt(plucks, (start + i) / SR);
    const rms = computeRMS(buf);
    const hz = rms >= 0.01 ? autoCorrelate(buf, SR) : -1;
    out.push({ rms, pitch: hz > 0 ? freqToMidi(hz) : null });
  }
  return out;
}

function onsets(input: MicFrame[]) {
  let state = initialMicOnsetState();
  const found: { frame: number; pitch: number }[] = [];
  input.forEach((f, frame) => {
    const r = nextMicFrame(state, f);
    state = r.state;
    if (r.onset !== null) found.push({ frame, pitch: r.onset });
  });
  return found;
}

describe('micOnset on synthetic buffers', () => {
  it('silence gives no onset', () => {
    expect(onsets(frames([], 2))).toEqual([]);
  });

  it('low noise below the gate gives no onset', () => {
    const noise = Array.from({ length: 25 }, (_, i) => ({
      rms: 0.005 + (i % 3) * 0.002,
      pitch: null,
    }));
    expect(onsets(noise)).toEqual([]);
  });

  it('two identical notes re-plucked while the first still rings give two onsets', () => {
    const found = onsets(
      frames(
        [
          { at: 0.1, midi: 57, until: 0.63 },
          { at: 0.63, midi: 57 },
        ],
        1.4,
      ),
    );
    expect(found).toHaveLength(2);
    for (const o of found) expect(Math.round(o.pitch)).toBe(57);
  });

  it('repeated eighth notes at 100 bpm on one string each register, at any poll phase', () => {
    for (let phase = 0; phase < POLL_SEC; phase += 0.01) {
      const at = [0.1, 0.4, 0.7, 1.0].map((t) => t + phase);
      const plucks = at.map((t, i) => ({ at: t, midi: 62, until: at[i + 1] }));
      expect(onsets(frames(plucks, 1.6)), `phase ${phase.toFixed(2)}`).toHaveLength(4);
    }
  });

  it('a level wobble below RISE_RATIO (tremolo, beating) is no new note', () => {
    const wobble = Array.from({ length: 20 }, (_, i) => ({
      rms: 0.1 * (i % 2 ? 1.1 : 0.9),
      pitch: 60,
    }));
    expect(onsets(wobble)).toHaveLength(1);
  });

  it('two identical notes with a gap give two onsets', () => {
    const found = onsets(
      frames(
        [
          { at: 0.1, midi: 64, decay: 12 },
          { at: 0.9, midi: 64, decay: 12 },
        ],
        1.6,
      ),
    );
    expect(found).toHaveLength(2);
  });

  it('one ringing note gives one onset (its decay is no attack)', () => {
    expect(onsets(frames([{ at: 0.1, midi: 60, decay: 2 }], 2))).toHaveLength(1);
  });

  it('a new semitone at the same level is a new note (legato), vibrato is not', () => {
    const level = (pitch: number) => ({ rms: 0.1, pitch });
    const legato = [60, 60, 60, 62, 62, 62].map(level);
    expect(onsets(legato).map((o) => o.pitch)).toEqual([60, 62]);
    const vibrato = [60, 60.3, 59.7, 60.4, 59.6, 60.2].map(level);
    expect(onsets(vibrato)).toHaveLength(1);
  });

  it('keeps a note 30 cents sharp as a fractional pitch with its cents', () => {
    const [o] = onsets(frames([{ at: 0.1, midi: 57.3 }], 0.6));
    expect(Math.round(o.pitch)).toBe(57);
    expect(Math.abs(centsOff(o.pitch, 57) - 30)).toBeLessThanOrEqual(3);
  });

  it('an unpitched attack waits for the pitch of the next frame', () => {
    let state = initialMicOnsetState();
    state = nextMicFrame(state, { rms: 0.2, pitch: 60 }).state;
    state = nextMicFrame(state, { rms: 0.1, pitch: 60 }).state;
    state = nextMicFrame(state, { rms: 0.08, pitch: 60 }).state;
    const attack = nextMicFrame(state, { rms: 0.3, pitch: null });
    expect(attack.onset).toBeNull();
    expect(nextMicFrame(attack.state, { rms: 0.25, pitch: 60.1 }).onset).toBeCloseTo(60.1);
  });
});
