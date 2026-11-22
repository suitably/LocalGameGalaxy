/**
 * Playing for another player in a party room [ID: LOGIC-PARTY-HELP]
 *
 * A player lets the others help on their own device (`PartyPlayer.helpers`); a helper may then
 * do on their own device whatever the helped player may do. The host checks it: an action passes
 * when the game's `authorize` allows it for the sender, or for a player the sender may help.
 */
import type { RoomPlayer } from './partyRoster';

/** Live events (`useRoomEvents`) that tell a player someone played for them. */
export const HELP_GAME_KEY = 'party-help';

export interface HelpEvent {
  type: 'helped';
  by: string;
  for: string;
  at: number;
}

/** Whether `helperId` may act for `playerId` (never for themselves: that is just playing). */
export function mayHelp(
  players: readonly RoomPlayer[],
  helperId: string,
  playerId: string | null | undefined,
): boolean {
  if (!playerId || helperId === playerId) return false;
  const player = players.find((p) => p.id === playerId);
  return player?.helpers === 'all' && players.some((p) => p.id === helperId);
}

/** The game's `authorize`, extended by the help grants of the room's players. */
export function withHelp<S, A>(
  authorize: (state: S, action: A, from: string) => boolean,
  players: () => readonly RoomPlayer[],
): (state: S, action: A, from: string) => boolean {
  return (state, action, from) => {
    if (authorize(state, action, from)) return true;
    const roster = players();
    return roster.some((p) => mayHelp(roster, from, p.id) && authorize(state, action, p.id));
  };
}
