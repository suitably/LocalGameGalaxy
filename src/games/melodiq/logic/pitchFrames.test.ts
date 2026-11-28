import { describe, expect, it } from 'vitest';
import {
  createPitchBundler,
  frameCapturedAt,
  isNewerSeq,
  newestPitch,
  parsePitchMessage,
  type PitchMessage,
} from './pitchFrames';

const sung = (note: number) => ({ note, frequency: 440, volume: 0.5 });

describe('createPitchBundler', () => {
  const setup = () => {
    const sent: PitchMessage[] = [];
    return { sent, bundler: createPitchBundler((m) => sent.push(m)) };
  };

  it('sends three voiced frames per message with their age', () => {
    const { sent, bundler } = setup();
    bundler.push(sung(60), 0);
    bundler.push(sung(61), 33);
    expect(sent).toEqual([]);
    bundler.push(sung(62), 66);
    expect(sent).toEqual([
      {
        type: 'pitch',
        seq: 0,
        frames: [
          { dt: 66, ...sung(60) },
          { dt: 33, ...sung(61) },
          { dt: 0, ...sung(62) },
        ],
      },
    ]);
  });

  it('sends nothing while silent, one silence frame when singing stops', () => {
    const { sent, bundler } = setup();
    bundler.push(null, 0);
    bundler.push(sung(60), 33);
    bundler.push(null, 66);
    bundler.push(null, 99);
    expect(sent).toHaveLength(1);
    expect(sent[0].frames.map((f) => f.note)).toEqual([60, -1]);
    expect(sent[0].frames[0].dt).toBe(33);
  });

  it('does not hold a frame longer than maxWaitMs', () => {
    const sent: PitchMessage[] = [];
    const bundler = createPitchBundler((m) => sent.push(m), { maxFrames: 10, maxWaitMs: 100 });
    bundler.push(sung(60), 0);
    bundler.push(sung(60), 100);
    expect(sent).toHaveLength(1);
    expect(sent[0].seq).toBe(0);
  });
});

describe('host side', () => {
  it('parses bundles and the single-frame format of older phones', () => {
    expect(parsePitchMessage({ type: 'pitch', seq: 4, frames: [{ dt: 10, ...sung(60) }] })).toEqual(
      { seq: 4, frames: [{ dt: 10, ...sung(60) }] },
    );
    expect(parsePitchMessage({ type: 'pitch', ...sung(60) })).toEqual({
      seq: null,
      frames: [{ dt: 0, ...sung(60) }],
    });
    expect(parsePitchMessage({ type: 'pitch', frames: [] })).toBeNull();
    expect(parsePitchMessage({ type: 'pitch', frames: [{ note: 'x' }] })).toBeNull();
    expect(parsePitchMessage({ type: 'other' })).toBeNull();
  });

  it('dates the newest frame by half the round trip and its age', () => {
    expect(frameCapturedAt(1000, 60, 20)).toBe(950);
    expect(frameCapturedAt(1000, null, 20)).toBe(980);
    const frames = [
      { dt: 66, ...sung(60) },
      { dt: 0, ...sung(62) },
    ];
    expect(newestPitch(frames, 1000, 40)).toEqual({ ...sung(62), capturedAt: 980 });
    expect(newestPitch([{ dt: 0, note: -1, frequency: -1, volume: 0 }], 1000, 40)).toBeNull();
  });

  it('skips older messages but accepts a restart after a reconnect', () => {
    expect(isNewerSeq(5, 4)).toBe(true);
    expect(isNewerSeq(4, 5)).toBe(false);
    expect(isNewerSeq(0, 5000)).toBe(true);
    expect(isNewerSeq(null, 5)).toBe(true);
    expect(isNewerSeq(0, null)).toBe(true);
  });
});
