/**
 * Exact seeking for recordings (Melodiq Notes). Browsers seek in M4A/MP4 and WAV to the sample,
 * but in an MP3 (VBR above all, and every older song download) only by an estimate that can land
 * seconds off while `currentTime` still looks right, which puts the notes consistently early or
 * late after every seek or loop. Such recordings are decoded once and played as WAV, the same
 * samples the alignment measured.
 */

const EXACT = new Set(['m4a', 'mp4', 'm4v', 'wav', 'wave']);

/** The companion server serves media as `/media?path=<file>&token=…`: the file is in the query. */
function fileOf(name: string) {
  const query = name.split('#')[0].split('?')[1];
  const served = query && new URLSearchParams(query).get('path');
  return served || name.split(/[?#]/)[0];
}

const extensionOf = (name: string) => {
  const path = fileOf(name);
  const dot = path.lastIndexOf('.');
  return dot < 0 ? '' : path.slice(dot + 1).toLowerCase();
};

/** Whether the browser seeks this recording exactly; `name` is a file name or URL. */
export const seeksExactly = (name: string) => EXACT.has(extensionOf(name));

/** 16-bit PCM WAV of up to two channels (a recording longer than ~6 h at 48 kHz stereo does not fit). */
export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const chans = channels.slice(0, 2);
  const frames = chans[0]?.length ?? 0;
  const blockAlign = chans.length * 2;
  const dataBytes = frames * blockAlign;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, chans.length, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * blockAlign, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, dataBytes, true);
  let at = 44;
  for (let f = 0; f < frames; f++) {
    for (const ch of chans) {
      const s = Math.max(-1, Math.min(1, ch[f]));
      v.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      at += 2;
    }
  }
  return buf;
}
