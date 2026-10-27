import { strFromU8, unzipSync } from 'fflate';
import { DRUM_VOICE_KEY, resolveDrumVoice, type DrumVoice } from './drumVoices';
import { guessInstrument } from './instruments';
import { ScoreImportError, writeOutNotes, type BarEvent } from './musicXml';
import { playOrder } from './musicXmlBars';
import { kid, kids, num, text } from './xmlDom';
import type { ScorePart, ScoreSong, TabPosition, TempoEvent, XmlParser } from './types';

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_VALUES: Record<string, number> = {
  Whole: 4,
  Half: 2,
  Quarter: 1,
  Eighth: 0.5,
  '16th': 0.25,
  '32nd': 0.125,
  '64th': 0.0625,
  '128th': 0.03125,
};
/** Tempo automation reference unit (second number of its value) in quarter notes. */
const TEMPO_UNIT: Record<string, number> = { '1': 0.5, '2': 1, '3': 1.5, '4': 2, '5': 3 };

/** Extracts `Content/score.gpif` from a Guitar Pro 7/8 (.gp) archive. */
export function extractGpif(data: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new ScoreImportError('invalid-gp');
  }
  const gpif = files['Content/score.gpif'];
  if (!gpif) throw new ScoreImportError('invalid-gp');
  return strFromU8(gpif);
}

const ids = (el: Element | null, tag: string) =>
  (text(el, tag) ?? '').split(/\s+/).filter((s) => s && s !== '-1');

function byId(root: Element, section: string, tag: string): Map<string, Element> {
  const out = new Map<string, Element>();
  const sec = kid(root, section);
  if (sec) for (const e of kids(sec, tag)) out.set(e.getAttribute('id') || '', e);
  return out;
}

/** `<Property name="…">` of a note or staff. */
function prop(el: Element | null, name: string): Element | null {
  const props = el ? kid(el, 'Properties') : null;
  return props
    ? (kids(props, 'Property').find((p) => p.getAttribute('name') === name) ?? null)
    : null;
}

function rhythmLength(r: Element | undefined): number {
  if (!r) return 1;
  let d = NOTE_VALUES[text(r, 'NoteValue') ?? ''] ?? 1;
  d *= 2 - 0.5 ** Number(kid(r, 'AugmentationDot')?.getAttribute('count') ?? 0);
  for (const tag of ['PrimaryTuplet', 'SecondaryTuplet']) {
    const tu = kid(r, tag);
    const n = Number(tu?.getAttribute('num'));
    const m = Number(tu?.getAttribute('den'));
    if (n > 0 && m > 0) d *= m / n;
  }
  return d;
}

interface TrackInfo {
  name: string;
  program: number | null;
  isDrum: boolean;
  tuning: number[];
  capo: number;
  /** Drum articulations in file order (notes point at them by index). */
  articulations: { key: number; name: string }[];
}

function readTrack(tr: Element): TrackInfo {
  const set = kid(tr, 'InstrumentSet');
  const staff = kid(kid(tr, 'Staves') ?? tr, 'Staff');
  const program = text(kid(tr, 'Sounds'), 'Program');
  return {
    name: text(tr, 'Name') || '',
    program: program === null ? null : Number(program),
    isDrum:
      (set ? text(set, 'Type') : null) === 'drumKit' ||
      num(kid(tr, 'MidiConnection'), 'PrimaryChannel', -1) === 9,
    tuning: ids(prop(staff, 'Tuning'), 'Pitches').map(Number),
    capo: num(prop(staff, 'CapoFret'), 'Fret'),
    articulations: set
      ? Array.from(set.getElementsByTagName('Articulation')).map((a) => ({
          key: num(a, 'OutputMidiNumber', -1),
          name: text(a, 'Name') || '',
        }))
      : [],
  };
}

/** Written string and fret; `Tuning` lists the strings from the lowest, so string 0 is the bottom line. */
function noteTab(note: Element, track: TrackInfo): TabPosition | null {
  const string = prop(note, 'String');
  const fret = prop(note, 'Fret');
  if (!string || !fret) return null;
  const s = num(string, 'String', -1);
  if (track.tuning[s] === undefined) return null;
  return { string: track.tuning.length - 1 - s, fret: num(fret, 'Fret') + track.capo };
}

function notePitch(note: Element, track: TrackInfo, tab: TabPosition | null): number | null {
  if (tab) return track.tuning[track.tuning.length - 1 - tab.string] + tab.fret;
  const midi = prop(note, 'Midi');
  if (midi) return num(midi, 'Number');
  const p = prop(note, 'ConcertPitch');
  if (!p) return null;
  const acc = text(p, 'Accidental') ?? '';
  const alter = acc === '#' ? 1 : acc === 'b' ? -1 : acc === '##' ? 2 : acc === 'bb' ? -2 : 0;
  return (num(p, 'Octave') + 1) * 12 + (STEP[text(p, 'Step') || 'C'] ?? 0) + alter;
}

/** Reads a Guitar Pro 7/8 score (`score.gpif` XML) into a playable song: every track becomes a part. */
export function parseGuitarPro(gpif: string, fileName: string, parseXml: XmlParser): ScoreSong {
  const doc = parseXml(gpif);
  const root = doc.documentElement;
  if (doc.getElementsByTagName('parsererror').length || root?.tagName !== 'GPIF')
    throw new ScoreImportError('invalid-gp');
  const tracks = kids(kid(root, 'Tracks') ?? root, 'Track').map(readTrack);
  if (!tracks.length) throw new ScoreImportError('no-parts');
  const masterBars = kids(kid(root, 'MasterBars') ?? root, 'MasterBar');
  const bars = byId(root, 'Bars', 'Bar');
  const voices = byId(root, 'Voices', 'Voice');
  const beats = byId(root, 'Beats', 'Beat');
  const notes = byId(root, 'Notes', 'Note');
  const rhythms = byId(root, 'Rhythms', 'Rhythm');

  const written = masterBars.map((mb) => {
    const [n, d] = (text(mb, 'Time') || '4/4').split('/').map(Number);
    const rep = kid(mb, 'Repeat');
    const endings = ids(mb, 'AlternateEndings').map(Number).filter(Boolean);
    return {
      len: n > 0 && d > 0 ? (n * 4) / d : 4,
      forward: rep?.getAttribute('start') === 'true',
      backward: rep?.getAttribute('end') === 'true',
      times: Number(rep?.getAttribute('count')) || 2,
      endings: endings.length ? endings : null,
      bars: (text(mb, 'Bars') ?? '').split(/\s+/),
    };
  });
  const order = playOrder(written);
  const lengths = order.map((k) => written[k].len);
  const starts: number[] = [];
  let end = 0;
  for (const l of lengths) {
    starts.push(end);
    end += l;
  }

  const tempoMarks = Array.from(
    kid(kid(root, 'MasterTrack') ?? root, 'Automations')?.getElementsByTagName('Automation') ?? [],
  )
    .filter((a) => text(a, 'Type') === 'Tempo')
    .map((a) => {
      const [bpm, unit] = (text(a, 'Value') || '').split(/\s+/);
      return {
        bar: num(a, 'Bar'),
        pos: num(a, 'Position'),
        bpm: Number(bpm) * (TEMPO_UNIT[unit] ?? 1),
      };
    })
    .filter((m) => m.bpm > 0)
    .sort((a, b) => a.bar - b.bar || a.pos - b.pos);
  const tempoMap: TempoEvent[] = [];
  order.forEach((k, idx) => {
    for (const m of tempoMarks) {
      if (m.bar !== k) continue;
      const last = tempoMap[tempoMap.length - 1];
      if (!last || last.bpm !== m.bpm)
        tempoMap.push({ beat: starts[idx] + m.pos * lengths[idx], bpm: m.bpm });
    }
  });
  if (!tempoMap.length || tempoMap[0].beat > 0)
    tempoMap.unshift({ beat: 0, bpm: tempoMap[0]?.bpm ?? 120 });

  const parts: ScorePart[] = tracks
    .map((track, ti) => {
      const barEvents = written.map((w) => {
        const evs: BarEvent[] = [];
        ids(bars.get(w.bars[ti]) ?? null, 'Voices').forEach((vid, vi) => {
          let pos = 0;
          for (const bid of ids(voices.get(vid) ?? null, 'Beats')) {
            const beat = beats.get(bid);
            if (!beat || kid(beat, 'GraceNotes')) continue;
            const dur = rhythmLength(rhythms.get(kid(beat, 'Rhythm')?.getAttribute('ref') || ''));
            for (const nid of ids(beat, 'Notes')) {
              const note = notes.get(nid);
              if (!note || prop(note, 'Muted')) continue;
              const tab = track.isDrum ? null : noteTab(note, track);
              let pitch = notePitch(note, track, tab);
              let drum: DrumVoice | undefined;
              if (track.isDrum) {
                const art = track.articulations[num(note, 'InstrumentArticulation', -1)];
                drum = resolveDrumVoice({ key: art?.key ?? pitch, name: art?.name }) ?? undefined;
                if (drum && drum !== 'other') pitch = DRUM_VOICE_KEY[drum];
                else pitch ??= art?.key ?? null;
              }
              if (pitch === null) continue;
              const tie = kid(note, 'Tie');
              evs.push({
                rel: pos,
                dur,
                pitch,
                voice: String(vi),
                tieStart: tie?.getAttribute('origin') === 'true',
                tieStop: tie?.getAttribute('destination') === 'true',
                syl: '',
                drum,
                tab: tab ?? undefined,
              });
            }
            pos += dur;
          }
        });
        return evs;
      });
      return {
        id: `gp${ti}`,
        name: track.name || `Track ${ti + 1}`,
        notes: writeOutNotes(barEvents, order, starts),
        isDrum: track.isDrum,
        program: track.program,
        guess: guessInstrument(track.name, track.program, track.isDrum, false),
      };
    })
    .filter((p) => p.notes.length > 0);

  const score = kid(root, 'Score');
  return {
    title: text(score, 'Title') || fileName.replace(/\.[^.]+$/, ''),
    artist: text(score, 'Artist') || '',
    source: fileName,
    tempoMap,
    measureStarts: starts,
    measureLengths: lengths,
    measureNumbers: order.map((k) => k + 1),
    end,
    parts,
  };
}
