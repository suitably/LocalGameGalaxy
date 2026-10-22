import { guessInstrument } from './instruments';
import { ScoreImportError } from './musicXml';
import type { ScoreNote, ScorePart, ScoreSong, TempoEvent } from './types';

const GM_FAMILIES = [
  'Piano',
  'Chromatic Percussion',
  'Organ',
  'Guitar',
  'Bass',
  'Strings',
  'Ensemble',
  'Brass',
  'Reed',
  'Pipe',
  'Synth Lead',
  'Synth Pad',
  'Synth Effects',
  'Ethnic',
  'Percussive',
  'Sound Effects',
];
const MAX_BARS = 5000;
const DRUM_CHANNEL = 9;

interface Group {
  track: number;
  channel: number;
  name: string;
  program: number | null;
  notes: ScoreNote[];
}

/** Reads a Standard MIDI File: one part per track and channel, lyrics attached to notes. */
export function parseMidi(data: Uint8Array, fileName: string): ScoreSong {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const tag = (at: number) =>
    String.fromCharCode(data[at], data[at + 1], data[at + 2], data[at + 3]);
  if (data.length < 14 || tag(0) !== 'MThd') throw new ScoreImportError('invalid-midi');
  const trackCount = dv.getUint16(10);
  const ppq = dv.getUint16(12);
  if (ppq & 0x8000) throw new ScoreImportError('smpte-unsupported');

  let p = 8 + dv.getUint32(4);
  const vlq = () => {
    let v = 0;
    let b: number;
    do {
      b = data[p++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80 && p < data.length);
    return v;
  };
  const tempos: { tick: number; bpm: number }[] = [];
  const sigs: { tick: number; num: number; den: number }[] = [];
  const groups = new Map<string, Group>();
  let maxTick = 0;

  for (let t = 0; t < trackCount && p + 8 <= data.length; t++) {
    if (tag(p) !== 'MTrk') break;
    const end = p + 8 + dv.getUint32(p + 4);
    p += 8;
    let tick = 0;
    let status = 0;
    let trackName = '';
    const sounding = new Map<number, number[]>();
    const programs: Record<number, number> = {};
    const lyrics: { tick: number; text: string }[] = [];
    while (p < end) {
      tick += vlq();
      const b = data[p];
      if (b === 0xff) {
        const type = data[p + 1];
        p += 2;
        const len = vlq();
        const bytes = data.subarray(p, p + len);
        if (type === 0x03)
          trackName = new TextDecoder('latin1').decode(bytes).replace(/\0/g, '').trim();
        if (type === 0x05)
          lyrics.push({ tick, text: new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '') });
        if (type === 0x51 && len === 3)
          tempos.push({ tick, bpm: 60e6 / ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) });
        if (type === 0x58 && len >= 2) sigs.push({ tick, num: bytes[0], den: 2 ** bytes[1] });
        p += len;
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        p++;
        p += vlq();
        continue;
      }
      if (b & 0x80) {
        status = b;
        p++;
      }
      const kind = status & 0xf0;
      const ch = status & 0x0f;
      if (kind === 0xc0) {
        programs[ch] = data[p++];
        continue;
      }
      if (kind === 0xd0) {
        p++;
        continue;
      }
      const key = data[p];
      const vel = data[p + 1];
      p += 2;
      const k = ch * 128 + key;
      if (kind === 0x90 && vel > 0) {
        if (!sounding.has(k)) sounding.set(k, []);
        sounding.get(k)?.push(tick);
      } else if (kind === 0x80 || kind === 0x90) {
        const start = sounding.get(k)?.shift();
        if (start === undefined) continue;
        const gk = `${t}:${ch}`;
        if (!groups.has(gk))
          groups.set(gk, { track: t, channel: ch, name: '', program: null, notes: [] });
        groups
          .get(gk)
          ?.notes.push({ t: start / ppq, dur: Math.max(0.05, (tick - start) / ppq), pitch: key });
        maxTick = Math.max(maxTick, tick);
      }
    }
    for (const g of groups.values()) {
      if (g.track !== t) continue;
      g.name ||= trackName;
      if (g.program === null && programs[g.channel] !== undefined) g.program = programs[g.channel];
      for (const l of lyrics) {
        const text = l.text.trim();
        if (!text) continue;
        const note = g.notes.find((n) => Math.abs(n.t - l.tick / ppq) < 0.01 && !n.syl);
        if (note) note.syl = text;
      }
    }
    p = end;
  }

  const tempoMap: TempoEvent[] = tempos
    .sort((a, b) => a.tick - b.tick)
    .map((x) => ({ beat: x.tick / ppq, bpm: Math.round(x.bpm * 100) / 100 }));
  if (!tempoMap.length || tempoMap[0].beat > 0)
    tempoMap.unshift({ beat: 0, bpm: tempoMap[0]?.bpm ?? 120 });

  sigs.sort((a, b) => a.tick - b.tick);
  const endBeat = maxTick / ppq;
  const lengths: number[] = [];
  const starts: number[] = [];
  let beat = 0;
  let si = 0;
  let sig = { num: 4, den: 4 };
  while (beat < endBeat - 0.01 && lengths.length < MAX_BARS) {
    while (si < sigs.length && sigs[si].tick / ppq <= beat + 1e-6) sig = sigs[si++];
    const len = (sig.num * 4) / sig.den;
    starts.push(beat);
    lengths.push(len);
    beat += len;
  }

  const named = Array.from(groups.values())
    .filter((g) => g.notes.length)
    .sort((a, b) => a.track - b.track || a.channel - b.channel);
  const nameCount: Record<string, number> = {};
  const baseNames = named.map((g, i) => {
    const isDrum = g.channel === DRUM_CHANNEL;
    const name = isDrum
      ? 'Drums'
      : g.name || (g.program !== null ? GM_FAMILIES[g.program >> 3] : `Track ${i + 1}`);
    nameCount[name] = (nameCount[name] ?? 0) + 1;
    return name;
  });
  const seen: Record<string, number> = {};
  const parts: ScorePart[] = named.map((g, i) => {
    const isDrum = g.channel === DRUM_CHANNEL;
    let name = baseNames[i];
    if (nameCount[name] > 1) {
      seen[name] = (seen[name] ?? 0) + 1;
      name = `${name} ${seen[name]}`;
    }
    const notes = g.notes.sort((a, b) => a.t - b.t || a.pitch - b.pitch);
    return {
      id: `m${i}`,
      name,
      notes,
      isDrum,
      program: g.program,
      guess: guessInstrument(
        name,
        g.program,
        isDrum,
        notes.some((n) => n.syl),
      ),
    };
  });

  return {
    title: fileName.replace(/\.[^.]+$/, ''),
    artist: '',
    source: fileName,
    tempoMap,
    measureStarts: starts,
    measureLengths: lengths,
    measureNumbers: starts.map((_, i) => i + 1),
    end: beat,
    parts,
  };
}
