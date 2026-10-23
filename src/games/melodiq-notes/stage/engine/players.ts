import { drumLaneOf, type InstrumentKind, type ScoreSong } from '../../../../modules/music-score';
import { buildChart, pitchRange } from '../logic/charts';
import { STAGE_INSTRUMENTS } from '../logic/instruments';
import { newStats } from '../logic/judging';
import type { BandEvent, StagePlayer, TrackSetup } from './types';

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

/** Every part plays in the band; the most fitting one is the player's. `band` adds up to three more players. */
export function defaultSetups(
  song: ScoreSong,
  preset: 'solo' | 'band' = 'solo',
): Record<string, TrackSetup> {
  const setups: Record<string, TrackSetup> = {};
  for (const p of song.parts) setups[p.id] = { inst: p.guess, role: 'band', rank: 0 };
  const ranked = [...song.parts].sort(
    (a, b) =>
      PREFERRED_SOLO.indexOf(a.guess) - PREFERRED_SOLO.indexOf(b.guess) ||
      b.notes.length - a.notes.length,
  );
  if (!ranked[0]) return setups;
  let rank = 1;
  setups[ranked[0].id] = { ...setups[ranked[0].id], role: 'play', rank: rank++ };
  if (preset === 'band') {
    const taken = new Set([ranked[0].guess]);
    for (const want of BAND_ORDER) {
      if (rank > MAX_PLAYERS) break;
      if (taken.has(want)) continue;
      const part = ranked.find((p) => p.guess === want && setups[p.id].role === 'band');
      if (!part) continue;
      setups[part.id] = { ...setups[part.id], role: 'play', rank: rank++ };
      taken.add(want);
    }
  }
  return setups;
}

export function createPlayers(
  song: ScoreSong,
  setups: Record<string, TrackSetup>,
  sectionCount: number,
): StagePlayer[] {
  return song.parts
    .filter((p) => setups[p.id]?.role === 'play')
    .sort((a, b) => setups[a.id].rank - setups[b.id].rank)
    .slice(0, MAX_PLAYERS)
    .map((part, i) => {
      const inst = setups[part.id].inst;
      const notes = buildChart(part, inst);
      const range = pitchRange(notes);
      return {
        no: i + 1,
        part,
        instrument: STAGE_INSTRUMENTS[inst],
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
      };
    });
}

/** Count-in clicks plus every note of the parts the band plays (parts with players are left out). */
export function buildBandEvents(
  song: ScoreSong,
  setups: Record<string, TrackSetup>,
  players: StagePlayer[],
  countIn: number,
): BandEvent[] {
  const events: BandEvent[] = [];
  for (let q = -countIn; q < 0; q++) events.push({ t: q, kind: 'click', accent: q === -countIn });
  for (const part of song.parts) {
    const setup = setups[part.id];
    if (!setup || setup.role === 'off' || players.some((p) => p.part === part)) continue;
    for (const n of part.notes) {
      if (part.isDrum) events.push({ t: n.t, kind: 'drum', lane: drumLaneOf(n.pitch) });
      else events.push({ t: n.t, kind: 'note', inst: setup.inst, midi: n.pitch, dur: n.dur });
    }
  }
  return events.sort((a, b) => a.t - b.t);
}
