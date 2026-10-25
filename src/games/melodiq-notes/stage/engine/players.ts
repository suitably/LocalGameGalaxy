import { drumLaneOf, type InstrumentKind, type ScoreSong } from '../../../../modules/music-score';
import { buildChart, pitchRange } from '../logic/charts';
import { STAGE_INSTRUMENTS } from '../logic/instruments';
import { newStats } from '../logic/judging';
import { REMOTE_MISS_GRACE_SEC } from '../../pult/logic/remoteHits';
import type { BandEvent, BandMode, PlayerSeat, StagePlayer } from './types';

export const MAX_PLAYERS = 4;
const PREFERRED_SOLO: InstrumentKind[] = [
  'keyboard',
  'guitar',
  'bass',
  'drums',
  'vocals',
  'ukulele',
  'melody',
];
const BAND_ORDER: InstrumentKind[] = ['drums', 'bass', 'guitar', 'keyboard', 'vocals', 'melody'];

/** One player on the part that suits playing alone best. */
export function defaultSeats(song: ScoreSong): PlayerSeat[] {
  const best = [...song.parts].sort(
    (a, b) =>
      PREFERRED_SOLO.indexOf(a.guess) - PREFERRED_SOLO.indexOf(b.guess) ||
      b.notes.length - a.notes.length,
  )[0];
  return best ? [{ partId: best.id, inst: best.guess }] : [];
}

/** The seat for one more player: a part nobody plays yet, preferring an instrument the group lacks. */
export function nextSeat(song: ScoreSong, seats: PlayerSeat[]): PlayerSeat | null {
  if (seats.length >= MAX_PLAYERS) return null;
  const taken = new Set(seats.map((s) => s.partId));
  const families = new Set(seats.map((s) => s.inst));
  const free = song.parts
    .filter((p) => !taken.has(p.id) && p.notes.length)
    .sort((a, b) => {
      const rank = (k: InstrumentKind) =>
        (families.has(k) ? BAND_ORDER.length : 0) +
        (BAND_ORDER.includes(k) ? BAND_ORDER.indexOf(k) : BAND_ORDER.length);
      return rank(a.guess) - rank(b.guess) || b.notes.length - a.notes.length;
    });
  return free[0] ? { partId: free[0].id, inst: free[0].guess } : null;
}

export function createPlayers(
  song: ScoreSong,
  seats: PlayerSeat[],
  sectionCount: number,
  fromBeat = 0,
): StagePlayer[] {
  return seats.slice(0, MAX_PLAYERS).flatMap((seat, i) => {
    const part = song.parts.find((p) => p.id === seat.partId);
    if (!part) return [];
    const notes = buildChart(part, seat.inst).filter((n) => n.t >= fromBeat);
    const range = pitchRange(notes);
    return [
      {
        no: i + 1,
        remoteId: seat.remoteId,
        missGraceSec: seat.remoteId ? REMOTE_MISS_GRACE_SEC : 0,
        part,
        instrument: STAGE_INSTRUMENTS[seat.inst],
        notes,
        range,
        octaveBase: 12 * Math.floor(range.median / 12),
        maxDur: notes.reduce((m, n) => Math.max(m, n.dur), 1),
        stats: newStats(sectionCount),
        pending: [],
        missIdx: 0,
        fx: [],
        pressed: new Set<number>(),
        history: [],
        voice: { pitch: range.median, singing: false },
      },
    ];
  });
}

/** Count-in clicks before `fromBeat` plus the notes from there on the synth plays for the band mode. */
export function buildBandEvents(
  song: ScoreSong,
  seats: PlayerSeat[],
  mode: BandMode,
  countIn: number,
  fromBeat = 0,
): BandEvent[] {
  const events: BandEvent[] = [];
  for (let q = -countIn; q < 0; q++)
    events.push({ t: fromBeat + q, kind: 'click', accent: q === -countIn });
  if (mode === 'none') return events;
  const played = new Set(seats.map((s) => s.partId));
  for (const part of song.parts) {
    if (mode === 'others' && played.has(part.id)) continue;
    for (const n of part.notes) {
      if (n.t < fromBeat) continue;
      if (part.isDrum) events.push({ t: n.t, kind: 'drum', lane: drumLaneOf(n.pitch) });
      else events.push({ t: n.t, kind: 'note', inst: part.guess, midi: n.pitch, dur: n.dur });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}
