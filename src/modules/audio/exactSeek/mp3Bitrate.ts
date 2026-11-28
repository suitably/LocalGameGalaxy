/**
 * Tells a variable-bitrate MP3 from a constant-bitrate one by its first bytes. Browsers seek in a
 * CBR MP3 to the sample, but in a VBR MP3 only by the Xing table's estimate, which lands up to
 * about a second off while `currentTime` still reports the requested time.
 */

export type Mp3Kind = 'vbr' | 'cbr';

/** Layer III bitrates in kbit/s by index, MPEG-1 and MPEG-2/2.5. */
const KBPS_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const KBPS_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES_V1 = [44100, 48000, 32000];
/** Frames read for the bitrate check when the file names no VBR header. */
const FRAMES_TO_CHECK = 40;

const ascii = (b: Uint8Array, at: number, len: number) =>
  String.fromCharCode(...b.subarray(at, at + len));

/** Bytes before the first MPEG frame: an ID3v2 tag (cover art can make it large), else 0. */
export function mp3AudioStart(b: Uint8Array): number {
  if (b.length < 10 || ascii(b, 0, 3) !== 'ID3') return 0;
  const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  const footer = b[5] & 0x10 ? 10 : 0;
  return 10 + size + footer;
}

interface Frame {
  bitrateIndex: number;
  length: number;
  /** Offset of a Xing/Info header from the frame start. */
  tagOffset: number;
}

function readFrame(b: Uint8Array, at: number): Frame | null {
  if (at + 4 > b.length || b[at] !== 0xff || (b[at + 1] & 0xe0) !== 0xe0) return null;
  const version = (b[at + 1] >> 3) & 3; // 3: MPEG-1, 2: MPEG-2, 0: MPEG-2.5
  const layer = (b[at + 1] >> 1) & 3; // 1: Layer III
  const bitrateIndex = b[at + 2] >> 4;
  const rateIndex = (b[at + 2] >> 2) & 3;
  if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3)
    return null;
  const v1 = version === 3;
  const sampleRate = SAMPLE_RATES_V1[rateIndex] / (v1 ? 1 : version === 2 ? 2 : 4);
  const kbps = (v1 ? KBPS_V1 : KBPS_V2)[bitrateIndex];
  const padding = (b[at + 2] >> 1) & 1;
  const length = Math.floor(((v1 ? 144000 : 72000) * kbps) / sampleRate) + padding;
  const mono = b[at + 3] >> 6 === 3;
  const sideInfo = v1 ? (mono ? 17 : 32) : mono ? 9 : 17;
  return { bitrateIndex, length, tagOffset: 4 + sideInfo };
}

/**
 * 'vbr' or 'cbr' for an MP3 (`b` holds its start, ID3 tag included), null when `b` is no MP3.
 * The first frame's Xing (VBR) / Info (CBR) / VBRI (VBR) header decides; without one, the
 * bitrates of the first frames do.
 */
export function mp3Kind(b: Uint8Array): Mp3Kind | null {
  let at = mp3AudioStart(b);
  const first = readFrame(b, at);
  if (!first) return null;
  const tag = ascii(b, at + first.tagOffset, 4);
  if (tag === 'Xing' || ascii(b, at + 36, 4) === 'VBRI') return 'vbr';
  if (tag === 'Info') return 'cbr';
  const rates = new Set<number>();
  for (let n = 0; n < FRAMES_TO_CHECK; n++) {
    const frame = readFrame(b, at);
    if (!frame) break;
    rates.add(frame.bitrateIndex);
    at += frame.length;
  }
  return rates.size > 1 ? 'vbr' : 'cbr';
}
