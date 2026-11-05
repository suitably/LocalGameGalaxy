import { describe, it, expect } from 'vitest';
import { encodeWav, seeksExactly } from '../exactSeek';

describe('exact seeking', () => {
  it('knows which formats the browser seeks in exactly', () => {
    expect(seeksExactly('/api/songs/1/media/Song.m4a?token=x')).toBe(true);
    expect(seeksExactly('take.WAV')).toBe(true);
    expect(seeksExactly('/media/Song.mp3?token=x.m4a')).toBe(false);
    expect(seeksExactly('song.ogg')).toBe(false);
    // companion media URLs carry the file in the query
    expect(seeksExactly('http://h:3000/media?path=%2Fsongs%2FA%20-%20B%2FA.m4a&token=t')).toBe(
      true,
    );
    expect(seeksExactly('/media?path=%2Fsongs%2FA%20-%20B%2FA.mp3&token=t')).toBe(false);
    expect(seeksExactly('blob:http://localhost/abc')).toBe(false);
  });

  it('writes 16-bit PCM WAV with interleaved channels', () => {
    const wav = encodeWav([Float32Array.of(0, 1, -1), Float32Array.of(0.5, 0, 2)], 44100);
    const v = new DataView(wav);
    const text = (at: number) => String.fromCharCode(...new Uint8Array(wav, at, 4));
    expect([text(0), text(8), text(12), text(36)]).toEqual(['RIFF', 'WAVE', 'fmt ', 'data']);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint32(40, true)).toBe(12);
    expect(wav.byteLength).toBe(56);
    const samples = Array.from({ length: 6 }, (_, i) => v.getInt16(44 + i * 2, true));
    // left, right per frame; values beyond ±1 are clipped
    expect(samples).toEqual([0, 16383, 32767, 0, -32768, 32767]);
  });
});
