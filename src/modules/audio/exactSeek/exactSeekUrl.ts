import { encodeWav } from './exactSeek';
import { mp3AudioStart, mp3Kind } from './mp3Bitrate';

/** Bytes after the ID3 tag that `mp3Kind` reads (40 frames of 320 kbit/s fit). */
const HEAD_BYTES = 64 * 1024;
/** An ID3 tag larger than this (huge cover art) is not read through: treated as no MP3. */
const MAX_HEAD_BYTES = 8 * 1024 * 1024;

/** A recording decoded once into a WAV object URL (the caller revokes it). */
export async function decodeToWavUrl(url: string): Promise<string> {
  const data = await (await fetch(url)).arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await ctx.decodeAudioData(data);
    const channels = Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) =>
      audio.getChannelData(c),
    );
    const wav = encodeWav(channels, audio.sampleRate);
    return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  } finally {
    void ctx.close();
  }
}

function concat(parts: Uint8Array[], length: number): Uint8Array {
  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** The file's first bytes, through its ID3 tag; the rest of the download is cancelled. */
async function readHead(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  let need = 0;
  while (need === 0 || length < need) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    length += value.length;
    if (need === 0 && length >= 10) {
      need = Math.min(MAX_HEAD_BYTES, mp3AudioStart(concat(parts, length)) + HEAD_BYTES);
    }
  }
  void reader.cancel().catch(() => {});
  return concat(parts, length);
}

/**
 * A WAV object URL to play `url` from when the browser cannot seek in it exactly (a VBR MP3),
 * else null: play `url` itself. Works for server and object URLs alike, as it reads the bytes.
 */
export async function exactSeekUrl(url: string): Promise<string | null> {
  return mp3Kind(await readHead(url)) === 'vbr' ? decodeToWavUrl(url) : null;
}
