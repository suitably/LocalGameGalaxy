/**
 * Pults on the stage: seats and their judgements [ID: GAME-MELODIQ-NOTES-PULT-HITS]
 *
 * A pult judges its player itself, against the stage clock it follows (see stageClock). The stage
 * only seats the pults and merges what they send: the judged notes (for the effects and the
 * section results) and the pult's totals, which win over anything the stage counted.
 */
import type { Judgement, StageNote } from '../../stage/logic/charts';
import type { PlayerSeat, StagePlayer } from '../../stage/engine/types';
import type { JudgedMark, PultMember, PultScore } from './protocol';

/**
 * The stage's seats with the pults on them: a pult takes the seat on its part (or a new one,
 * up to `max`); a seat whose pult left is dropped while another seat remains.
 */
export function mergeRemoteSeats(
  seats: PlayerSeat[],
  members: PultMember[],
  max: number,
): PlayerSeat[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  let next = seats.flatMap((s): PlayerSeat[] => {
    if (!s.remoteId) return [s];
    const m = byId.get(s.remoteId);
    if (m && m.partId === s.partId) return [{ ...s, inst: m.inst, name: m.name }];
    return [];
  });
  for (const m of members) {
    if (next.some((s) => s.remoteId === m.id)) continue;
    const i = next.findIndex((s) => s.partId === m.partId && !s.remoteId);
    const seat: PlayerSeat = { partId: m.partId, inst: m.inst, remoteId: m.id, name: m.name };
    if (i >= 0) next = next.map((s, k) => (k === i ? seat : s));
    else if (next.length < max) next = [...next, seat];
  }
  // keep one seat so the stage always has someone to show
  return next.length ? next : seats.slice(0, 1).map(({ partId, inst }) => ({ partId, inst }));
}

type Judge = (p: StagePlayer, n: StageNote, kind: Judgement) => void;

/** Applies a pult's batch to its player on the stage; returns how many notes were new. */
export function applyJudged(
  p: StagePlayer,
  marks: JudgedMark[],
  score: PultScore,
  judge: Judge,
): number {
  let applied = 0;
  for (const [id, kind] of marks) {
    const n = p.notes[id];
    if (!n || n.id !== id || n.judged) continue;
    judge(p, n, kind);
    applied++;
  }
  Object.assign(p.stats, score);
  return applied;
}

/** The totals a pult sends with every batch. */
export const scoreOf = ({ score, combo, maxCombo, judged, weightSum }: PultScore): PultScore => ({
  score,
  combo,
  maxCombo,
  judged,
  weightSum,
});
