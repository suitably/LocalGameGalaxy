/**
 * When a guest follows the host back to the party lobby [ID: LOGIC-PARTY-LOBBY-RETURN]
 */
import type { PartyRoomState } from './universalPartyManager';

/**
 * True when this guest's game page should give way to the lobby: the room went from a running
 * game back to the lobby, or the page opened (`previous` unknown) after a game in the room had
 * already ended (`statusAt` is set) — e.g. a slow device that loaded the game after the host
 * returned. A room that never ran a game has no `statusAt`, so opening a game link there stays.
 */
export function shouldFollowToLobby(
  previous: PartyRoomState['status'] | undefined,
  next: Pick<PartyRoomState, 'status' | 'statusAt'>,
): boolean {
  if (next.status !== 'lobby') return false;
  return previous === 'in_game' || (previous === undefined && Boolean(next.statusAt));
}
