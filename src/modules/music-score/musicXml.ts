import { DRUM_VOICE_KEY, parseSticking, resolveDrumVoice, type DrumVoice } from './drumVoices';
import { guessInstrument } from './instruments';
import { playOrder, readBars } from './musicXmlBars';
import { readHarmony, writeOutChords, type BarChord } from './musicXmlHarmony';
import { kid, kids, num, text } from './xmlDom';
import type {
  ScoreChord,
  ScoreNote,
  ScorePart,
  ScoreSong,
  TabPosition,
  TempoEvent,
  XmlParser,
} from './types';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export class ScoreImportError extends Error {}

interface PartInfo {
  name: string;
  program: number | null;
  channel: number | null;
  unpitched: Record<string, number>;
  /** `<instrument-name>` by instrument id. */
  names: Record<string, string>;
}

function readPartList(root: Element): Record<string, PartInfo> {
  const out: Record<string, PartInfo> = {};
  for (const sp of Array.from(root.getElementsByTagName('score-part'))) {
    const info: PartInfo = {
      name: text(sp, 'part-name') || sp.getAttribute('id') || '',
      program: null,
      channel: null,
      unpitched: {},
      names: {},
    };
    for (const si of Array.from(sp.getElementsByTagName('score-instrument'))) {
      const nm = text(si, 'instrument-name');
      if (nm) info.names[si.getAttribute('id') || ''] = nm;
    }
    for (const mi of Array.from(sp.getElementsByTagName('midi-instrument'))) {
      const up = text(mi, 'midi-unpitched');
      if (up) info.unpitched[mi.getAttribute('id') || ''] = Number(up) - 1;
      if (info.program === null && text(mi, 'midi-program'))
        info.program = num(mi, 'midi-program') - 1;
      if (info.channel === null && text(mi, 'midi-channel')) info.channel = num(mi, 'midi-channel');
    }
    out[sp.getAttribute('id') || ''] = info;
  }
  return out;
}

/** One note of a written bar; `rel` is its beat within the bar. Shared with the Guitar Pro reader. */
export interface BarEvent {
  rel: number;
  dur: number;
  pitch: number;
  voice: string;
  tieStart: boolean;
  tieStop: boolean;
  syl: string;
  /** Syllables by verse (`<lyric number>`); when set, `writeOutNotes` picks one per pass. */
  verses?: Record<number, string>;
  drum?: DrumVoice;
  hand?: 'R' | 'L';
  tab?: TabPosition;
}

function readPartBars(pe: Element, info: PartInfo) {
  let div = 1;
  let transpose = 0;
  let hasLyrics = false;
  let isDrum = info.channel === 10;
  const chords: BarChord[][] = [];
  const bars = kids(pe, 'measure').map((m) => {
    const evs: BarEvent[] = [];
    const barChords: BarChord[] = [];
    chords.push(barChords);
    let pos = 0;
    let last = 0;
    for (const c of kids(m)) {
      if (c.tagName === 'attributes') {
        div = num(c, 'divisions', div) || div;
        const tr = c.getElementsByTagName('transpose')[0];
        if (tr) transpose = num(tr, 'chromatic') + 12 * num(tr, 'octave-change');
      } else if (c.tagName === 'backup') pos -= num(c, 'duration');
      else if (c.tagName === 'forward') pos += num(c, 'duration');
      else if (c.tagName === 'harmony') {
        const chord = readHarmony(c, pos, div, transpose);
        if (chord) barChords.push(chord);
      } else if (c.tagName === 'note') {
        if (kid(c, 'grace')) continue;
        const d = num(c, 'duration');
        const isChord = !!kid(c, 'chord');
        const start = isChord ? last : pos;
        if (!isChord) {
          last = pos;
          pos += d;
        }
        if (kid(c, 'rest')) continue;
        let pitch: number | null = null;
        let drum: DrumVoice | undefined;
        let hand: 'R' | 'L' | undefined;
        const p = kid(c, 'pitch');
        const u = kid(c, 'unpitched');
        if (p)
          pitch =
            (num(p, 'octave') + 1) * 12 +
            (STEP[text(p, 'step') || 'C'] ?? 0) +
            Math.round(num(p, 'alter')) +
            transpose;
        else if (u) {
          isDrum = true;
          const iid = kid(c, 'instrument')?.getAttribute('id') || '';
          const mapped = info.unpitched[iid];
          const nh = kid(c, 'notehead');
          const tech = kid(kid(c, 'notations') ?? c, 'technical');
          const mark = tech ? text(tech, 'other-technical') : null;
          const found = resolveDrumVoice({
            key: mapped,
            name: info.names[iid],
            notehead: nh?.textContent?.trim(),
            parenthesized: nh?.getAttribute('parentheses') === 'yes',
            open: !!tech && !!kid(tech, 'open'),
            stopped: !!tech && !!kid(tech, 'stopped'),
            mark,
          });
          if (found && found !== 'other') {
            drum = found;
            pitch = DRUM_VOICE_KEY[found];
          } else if (found) drum = found;
          pitch ??=
            mapped ??
            (num(u, 'display-octave', 4) + 1) * 12 + (STEP[text(u, 'display-step') || 'C'] ?? 0);
          hand = parseSticking(tech ? text(tech, 'fingering') : null) ?? undefined;
        }
        if (pitch === null) continue;
        const ties = Array.from(c.getElementsByTagName('tie')).map((x) => x.getAttribute('type'));
        const lyrics = kids(c, 'lyric');
        let syl = '';
        let verses: Record<number, string> | undefined;
        const lyricHand = u ? parseSticking(text(lyrics[0] ?? null, 'text')) : null;
        if (lyricHand) hand ??= lyricHand;
        else {
          verses = readVerses(lyrics);
          const nums = Object.keys(verses).map(Number);
          if (nums.length) {
            hasLyrics = true;
            syl = verses[Math.min(...nums)];
          } else verses = undefined;
        }
        evs.push({
          rel: start / div,
          dur: d / div,
          pitch,
          voice: text(c, 'voice') || '1',
          tieStart: ties.includes('start'),
          tieStop: ties.includes('stop'),
          syl,
          verses,
          drum,
          hand,
        });
      }
    }
    return evs;
  });
  return { bars, chords, hasLyrics, isDrum };
}

/** Syllable of every `<lyric>` of a note by verse; a missing or non-numeric `number` counts by position. */
function readVerses(lyrics: Element[]): Record<number, string> {
  const out: Record<number, string> = {};
  lyrics.forEach((l, k) => {
    const t = text(l, 'text');
    if (!t) return;
    const verse = Number(/\d+/.exec(l.getAttribute('number') ?? '')?.[0]) || k + 1;
    out[verse] ??= t + (/begin|middle/.test(text(l, 'syllabic') || '') ? '-' : '');
  });
  return out;
}

/**
 * Verse sung in the `pass`-th play of a written bar: that verse when the bar has it,
 * else the bar's first verse (a chorus written once, or a pass beyond the last verse).
 */
function verseOf(evs: BarEvent[], pass: number): number {
  const nums = evs.flatMap((e) => (e.verses ? Object.keys(e.verses).map(Number) : []));
  return nums.includes(pass) || !nums.length ? pass : Math.min(...nums);
}

/** Lays written bars out in play order and merges tied notes. */
export function writeOutNotes(bars: BarEvent[][], order: number[], starts: number[]): ScoreNote[] {
  const notes: ScoreNote[] = [];
  const open = new Map<string, ScoreNote>();
  const plays = new Map<number, number>();
  order.forEach((k, idx) => {
    const pass = (plays.get(k) ?? 0) + 1;
    plays.set(k, pass);
    const verse = verseOf(bars[k] ?? [], pass);
    for (const ev of bars[k] ?? []) {
      const t = starts[idx] + ev.rel;
      const key = `${ev.pitch}|${ev.voice}`;
      const prev = open.get(key);
      if (ev.tieStop && prev && Math.abs(prev.t + prev.dur - t) < 0.01) {
        prev.dur += ev.dur;
        if (!ev.tieStart) open.delete(key);
        continue;
      }
      const note: ScoreNote = { t, dur: Math.max(0.05, ev.dur), pitch: ev.pitch };
      const syl = ev.verses ? ev.verses[verse] : ev.syl;
      if (syl) note.syl = syl;
      if (ev.drum) note.drum = ev.drum;
      if (ev.hand) note.hand = ev.hand;
      if (ev.tab) note.tab = ev.tab;
      notes.push(note);
      if (ev.tieStart) open.set(key, note);
      else open.delete(key);
    }
  });
  return notes.sort((a, b) => a.t - b.t || a.pitch - b.pitch);
}

/** Reads a partwise MusicXML score (MuseScore's export format) into a playable song. */
export function parseMusicXml(xml: string, fileName: string, parseXml: XmlParser): ScoreSong {
  const doc = parseXml(xml);
  if (doc.getElementsByTagName('parsererror').length) throw new ScoreImportError('invalid-xml');
  const root = doc.documentElement;
  if (root.tagName === 'score-timewise') throw new ScoreImportError('timewise-unsupported');
  if (root.tagName !== 'score-partwise') throw new ScoreImportError('not-a-score');
  const partEls = kids(root, 'part');
  if (!partEls.length) throw new ScoreImportError('no-parts');

  const partList = readPartList(root);
  const bars = readBars(partEls[0], partEls, root);
  const order = playOrder(bars);
  const lengths = order.map((k) => bars[k].len);
  const starts: number[] = [];
  let end = 0;
  for (const l of lengths) {
    starts.push(end);
    end += l;
  }
  const tempoMap: TempoEvent[] = [];
  order.forEach((k, idx) => {
    const t = bars[k].tempo;
    if (t && (!tempoMap.length || tempoMap[tempoMap.length - 1].bpm !== t))
      tempoMap.push({ beat: starts[idx], bpm: t });
  });
  if (!tempoMap.length || tempoMap[0].beat > 0)
    tempoMap.unshift({ beat: 0, bpm: tempoMap[0]?.bpm ?? 120 });

  let chords: ScoreChord[] = [];
  const parts: ScorePart[] = partEls
    .map((pe) => {
      const id = pe.getAttribute('id') || '';
      const info = partList[id] ?? {
        name: id,
        program: null,
        channel: null,
        unpitched: {},
        names: {},
      };
      const read = readPartBars(pe, info);
      if (!chords.length) chords = writeOutChords(read.chords, order, starts);
      return {
        id,
        name: info.name,
        notes: writeOutNotes(read.bars, order, starts),
        isDrum: read.isDrum,
        program: info.program,
        guess: guessInstrument(info.name, info.program, read.isDrum, read.hasLyrics),
      };
    })
    .filter((p) => p.notes.length > 0);

  const composer = Array.from(root.getElementsByTagName('creator')).find(
    (c) => c.getAttribute('type') === 'composer',
  );
  return {
    title:
      text(root, 'work-title') || text(root, 'movement-title') || fileName.replace(/\.[^.]+$/, ''),
    artist: composer?.textContent?.trim() || '',
    source: fileName,
    tempoMap,
    measureStarts: starts,
    measureLengths: lengths,
    measureNumbers: order.map((k) => k + 1),
    end,
    parts,
    ...(chords.length ? { chords } : {}),
  };
}
