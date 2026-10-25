/**
 * Judging a pult's input on the stage [ID: GAME-MELODIQ-NOTES-PULT-HITS]
 *
 * Input from a pult arrives late (network). It carries the stage time it was played at, so the
 * stage judges it at the beat that was current then. A remote player's notes count as missed only
 * after an extra grace, so a late message can still hit them.
 */
import type { PlayerSeat } from '../../stage/engine/types';
import type { PultMember } from './protocol';

/** Longest delay a pult's input may have and still be judged. */
export const MAX_REMOTE_LAG_SEC = 0.5;
export const REMOTE_MISS_GRACE_SEC = MAX_REMOTE_LAG_SEC;

/** Seconds since the input was played, or null when it is too old to judge. */
export function remoteLagSec(stageNowMs: number, atMs: number): number | null {
  const lag = (stageNowMs - atMs) / 1000;
  if (!Number.isFinite(lag) || lag > MAX_REMOTE_LAG_SEC) return null;
  // a slightly wrong offset can put it a little in the future: treat it as now
  return Math.max(0, lag);
}

/** The beat that was current `lagSec` ago. */
export const beatBefore = (beat: number, lagSec: number, secPerBeat: number) =>
  secPerBeat > 0 ? beat - lagSec / secPerBeat : beat;

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
    if (m && m.partId === s.partId) return [{ ...s, inst: m.inst }];
    return [];
  });
  for (const m of members) {
    if (next.some((s) => s.remoteId === m.id)) continue;
    const i = next.findIndex((s) => s.partId === m.partId && !s.remoteId);
    const seat: PlayerSeat = { partId: m.partId, inst: m.inst, remoteId: m.id };
    if (i >= 0) next = next.map((s, k) => (k === i ? seat : s));
    else if (next.length < max) next = [...next, seat];
  }
  // keep one seat so the stage always has someone to show
  return next.length ? next : seats.slice(0, 1).map(({ partId, inst }) => ({ partId, inst }));
}
