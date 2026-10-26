/**
 * What a pult needs to know of the stage's song [ID: GAME-MELODIQ-NOTES-PULT-SONG]
 *
 * The room state lists the playable parts with their instrument and keyboard octave. The notes of
 * one part travel on request as a `PackedChart`: the song's timeline plus that part, with the
 * notes packed into tuples to keep the message small. The pult rebuilds a one-part `ScoreSong`
 * from it, so `buildChart` gives both sides the same notes with the same ids.
 */
import type { ScoreNote, ScorePart, ScoreSong } from '../../../../modules/music-score';
import { buildChart, pitchRange } from '../../stage/logic/charts';
import type { PultSong } from './protocol';

/** Short hash of everything the judging depends on, so a changed song gets a new key. */
export function songKeyOf(song: ScoreSong): string {
  let h = 5381;
  const add = (v: string | number) => {
    const s = String(v);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  };
  add(song.title);
  add(song.source);
  add(song.end);
  for (const p of song.parts) {
    add(p.id);
    for (const n of p.notes) add(`${n.t}:${n.dur}:${n.pitch}`);
  }
  return (h >>> 0).toString(36);
}

export function pultSongOf(song: ScoreSong): PultSong {
  return {
    key: songKeyOf(song),
    title: song.title,
    parts: song.parts
      .filter((p) => p.notes.length)
      .map((p) => ({
        id: p.id,
        name: p.name,
        inst: p.guess,
        octaveBase: 12 * Math.floor(pitchRange(buildChart(p, p.guess)).median / 12),
      })),
  };
}

/** `[t, dur, pitch]`, plus syllable, drum voice and hand only when the note has them. */
type PackedNote = [number, number, number, string?, ScoreNote['drum']?, ScoreNote['hand']?];

export interface PackedChart {
  songKey: string;
  song: Omit<ScoreSong, 'parts'>;
  part: Omit<ScorePart, 'notes'> & { notes: PackedNote[] };
}

function packNote(n: ScoreNote): PackedNote {
  const out: PackedNote = [n.t, n.dur, n.pitch];
  if (n.syl !== undefined || n.drum !== undefined || n.hand !== undefined) out.push(n.syl ?? '');
  if (n.drum !== undefined || n.hand !== undefined) out.push(n.drum);
  if (n.hand !== undefined) out.push(n.hand);
  return out;
}

function unpackNote([t, dur, pitch, syl, drum, hand]: PackedNote): ScoreNote {
  const n: ScoreNote = { t, dur, pitch };
  if (syl) n.syl = syl;
  if (drum) n.drum = drum;
  if (hand) n.hand = hand;
  return n;
}

/** The song's timeline and one of its parts, ready to send; null when the song lacks the part. */
export function packChart(song: ScoreSong, partId: string): PackedChart | null {
  const part = song.parts.find((p) => p.id === partId);
  if (!part) return null;
  const { title, artist, source, tempoMap, measureStarts, measureLengths, measureNumbers, end } =
    song;
  return {
    songKey: songKeyOf(song),
    song: { title, artist, source, tempoMap, measureStarts, measureLengths, measureNumbers, end },
    part: { ...part, notes: part.notes.map(packNote) },
  };
}

/** The one-part song a pult plays. */
export function unpackChart(chart: PackedChart): ScoreSong {
  return {
    ...chart.song,
    parts: [{ ...chart.part, notes: chart.part.notes.map(unpackNote) }],
  };
}

/**
 * Link a player opens on their own device; `part` is the part offered to them, `relay` the
 * companion server (`gameRelay`) when one is active on the stage.
 */
export function pultJoinUrl(
  base: string,
  roomId: string,
  partId?: string,
  relay?: string | null,
): string {
  let url = `${base}#/games/melodiq-notes?pult=${encodeURIComponent(roomId)}`;
  if (partId) url += `&part=${encodeURIComponent(partId)}`;
  if (relay) url += `&gameRelay=${encodeURIComponent(relay)}`;
  return url;
}
