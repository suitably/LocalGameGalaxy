import {
  DRUM_PERCUSSION_LANE,
  drumLaneOf,
  drumLaneOfVoice,
  type InstrumentKind,
  type ScorePart,
  type ScoreSong,
} from '../../../../modules/music-score';
import { buildChart, pitchRange } from '../logic/charts';
import { drumKitOf, type DrumKitOptions } from '../logic/drumLanes';
import { STAGE_INSTRUMENTS } from '../logic/instruments';
import { newStats } from '../logic/judging';
import type { StageEngine } from './StageEngine';
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

/**
 * One player on the part that suits playing alone best: a part of the instrument the player
 * last picked (`prefer`, #635) when the song has one with notes.
 */
export function defaultSeats(song: ScoreSong, prefer: InstrumentKind | null = null): PlayerSeat[] {
  const rank = (k: InstrumentKind) => (k === prefer ? -1 : PREFERRED_SOLO.indexOf(k));
  const best = [...song.parts]
    .filter((p) => p.notes.length || song.parts.every((q) => !q.notes.length))
    .sort((a, b) => rank(a.guess) - rank(b.guess) || b.notes.length - a.notes.length)[0];
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

/** Drum options of this screen; a pult seat always has one tom pad and no percussion pad. */
export const DEFAULT_DRUM_OPTIONS: DrumKitOptions = { judgePercussion: false, mergeToms: false };

const seatDrumOptions = (seat: PlayerSeat, drums: DrumKitOptions): DrumKitOptions =>
  seat.remoteId || drums.mergeToms ? { judgePercussion: false, mergeToms: true } : drums;

export function createPlayers(
  song: ScoreSong,
  seats: PlayerSeat[],
  sectionCount: number,
  fromBeat = 0,
  drums: DrumKitOptions = DEFAULT_DRUM_OPTIONS,
): StagePlayer[] {
  return seats.slice(0, MAX_PLAYERS).flatMap((seat, i) => {
    const part = song.parts.find((p) => p.id === seat.partId);
    if (!part) return [];
    const chart = buildChart(part, seat.inst).filter((n) => n.t >= fromBeat);
    const instrument = STAGE_INSTRUMENTS[seat.inst];
    const kit =
      instrument.view === 'drums' ? drumKitOf(chart, seatDrumOptions(seat, drums)) : undefined;
    const notes = kit ? kit.notes : chart;
    const range = pitchRange(notes);
    return [
      {
        no: i + 1,
        remoteId: seat.remoteId,
        name: seat.name,
        part,
        instrument,
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
        ...(kit && { drumKit: { pads: kit.pads, mergeToms: kit.mergeToms, shown: kit.shown } }),
      },
    ];
  });
}

/** The engine's players for `song`: its seats from its start beat, with its drum options. */
export const playersFor = (e: StageEngine, song: ScoreSong) =>
  createPlayers(song, e.seats, e.sections.length, e.startBeat, e.drumOptions);

/** A stage song may carry hidden parts the synth plays as backing (#564, `stageView`). */
export type StageScoreSong = ScoreSong & { backing?: ScorePart[] };

export const backingOf = (song: ScoreSong): ScorePart[] => (song as StageScoreSong).backing ?? [];

/**
 * Count-in clicks before `fromBeat` plus the notes from there on the synth plays for the band mode.
 * A drummer's display-only percussion still sounds with the band ('others' too), since nobody plays it.
 * Hidden parts in `backing` have no player, so they sound in both `all` and `others`.
 */
export function buildBandEvents(
  song: ScoreSong,
  seats: PlayerSeat[],
  mode: BandMode,
  countIn: number,
  fromBeat = 0,
  drums: DrumKitOptions = DEFAULT_DRUM_OPTIONS,
): BandEvent[] {
  const events: BandEvent[] = [];
  for (let q = -countIn; q < 0; q++)
    events.push({ t: fromBeat + q, kind: 'click', accent: q === -countIn });
  if (mode === 'none') return events;
  const played = new Set(seats.map((s) => s.partId));
  const percussionOnly = new Set(
    seats
      .filter((s) => s.inst === 'drums' && !seatDrumOptions(s, drums).judgePercussion)
      .map((s) => s.partId),
  );
  for (const part of [...song.parts, ...backingOf(song)]) {
    const onlyPercussion = mode === 'others' && played.has(part.id);
    if (onlyPercussion && !(part.isDrum && percussionOnly.has(part.id))) continue;
    for (const n of part.notes) {
      if (n.t < fromBeat) continue;
      const lane = !part.isDrum ? -1 : n.drum ? drumLaneOfVoice(n.drum) : drumLaneOf(n.pitch);
      if (onlyPercussion && lane !== DRUM_PERCUSSION_LANE) continue;
      if (part.isDrum) events.push({ t: n.t, kind: 'drum', lane });
      else events.push({ t: n.t, kind: 'note', inst: part.guess, midi: n.pitch, dur: n.dur });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}

/** General MIDI percussion channel; e-drum modules send on it almost always. */
export const GM_DRUM_CHANNEL = 10;

/**
 * The seat an e-drum kit switches a player to: the drum view, on the song's drum part if it has
 * one. Null when the player chose part or view themselves, or already sees drums.
 */
export function autoDrumSeat(seat: PlayerSeat, song: ScoreSong): PlayerSeat | null {
  if (seat.chosen || seat.remoteId || seat.inst === 'drums') return null;
  const drumPart = song.parts.find((p) => p.guess === 'drums');
  return { ...seat, partId: drumPart?.id ?? seat.partId, inst: 'drums' };
}
