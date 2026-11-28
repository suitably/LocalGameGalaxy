import { describe, it, expect } from 'vitest';
import { mp3AudioStart, mp3Kind } from './mp3Bitrate';

/** One MPEG-1 Layer III stereo frame at 44.1 kHz; `tag` goes where a Xing/Info header sits. */
function frame(bitrateIndex: number, tag = ''): number[] {
  const kbps = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][bitrateIndex];
  const bytes = new Array<number>(Math.floor((144000 * kbps) / 44100)).fill(0);
  bytes.splice(0, 4, 0xff, 0xfb, bitrateIndex << 4, 0x00);
  [...tag].forEach((c, i) => (bytes[36 + i] = c.charCodeAt(0)));
  return bytes;
}

function id3(size: number): number[] {
  const synchsafe = [21, 14, 7, 0].map((s) => (size >> s) & 0x7f);
  return [0x49, 0x44, 0x33, 4, 0, 0, ...synchsafe, ...new Array<number>(size).fill(0)];
}

const file = (...parts: number[][]) => Uint8Array.from(parts.flat());

describe('mp3Kind', () => {
  it('reads the Xing / Info header of the first frame', () => {
    expect(mp3Kind(file(frame(9, 'Xing'), frame(9), frame(11)))).toBe('vbr');
    expect(mp3Kind(file(frame(14, 'Info'), frame(14), frame(14)))).toBe('cbr');
  });

  it('skips an ID3v2 tag before the first frame', () => {
    expect(mp3AudioStart(file(id3(300), frame(9)))).toBe(310);
    expect(mp3Kind(file(id3(300), frame(9, 'Xing'), frame(9)))).toBe('vbr');
  });

  it('compares frame bitrates when there is no header', () => {
    expect(mp3Kind(file(frame(9), frame(9), frame(9)))).toBe('cbr');
    expect(mp3Kind(file(frame(9), frame(12), frame(9)))).toBe('vbr');
  });

  it('is null for anything that is no MP3', () => {
    expect(mp3Kind(new TextEncoder().encode('RIFF....WAVEfmt '))).toBeNull();
    expect(mp3Kind(new Uint8Array())).toBeNull();
    // ftyp box of an M4A
    expect(mp3Kind(file([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]))).toBeNull();
  });
});
