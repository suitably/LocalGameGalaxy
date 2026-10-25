/**
 * Players on their own device (pults) on the stage engine [ID: GAME-MELODIQ-NOTES-STAGE-REMOTE]
 */
import { beatBefore, mergeRemoteSeats } from '../../pult/logic/remoteHits';
import type { PultInput, PultMember } from '../../pult/logic/protocol';
import { playLane, playPitch } from './input';
import { MAX_PLAYERS } from './players';
import type { StageEngine } from './StageEngine';

/** Seats the pults in the room (see mergeRemoteSeats); resets only when something changed. */
export function seatRemotes(e: StageEngine, members: PultMember[]) {
  if (!e.song) return;
  const next = mergeRemoteSeats(e.seats, members, MAX_PLAYERS);
  if (JSON.stringify(next) === JSON.stringify(e.seats)) return;
  e.seats = next;
  e.reset();
}

/** Input from a pult, played `lagSec` seconds ago; judged at the beat that was current then. */
export function playRemote(e: StageEngine, remoteId: string, input: PultInput, lagSec: number) {
  const player = e.players.find((p) => p.remoteId === remoteId);
  if (!player) return;
  if (input.kind === 'voice') {
    player.voice = { pitch: input.pitch ?? player.voice.pitch, singing: input.pitch !== null };
    return;
  }
  const beat = beatBefore(e.beat, lagSec, e.secPerBeat(Math.max(0, e.beat)));
  const at = { player, beat, silent: true };
  if (input.kind === 'lane') playLane(e, input.lane, undefined, at);
  else playPitch(e, input.pitch, at);
}
