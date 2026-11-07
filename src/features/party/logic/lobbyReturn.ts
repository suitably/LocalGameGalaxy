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

/**
 * `statusAt` of the game that was already running when this device opened the lobby from it
 * (#657), or `null` when the lobby opened without a running game in memory (fresh page, invite
 * link). Such a visit must not bounce the player straight back into the game.
 */
export function visitedGameAt(
  known: Pick<PartyRoomState, 'roomId' | 'status' | 'statusAt'> | null,
  roomId: string,
): number | null {
  return known?.roomId === roomId && known.status === 'in_game' ? (known.statusAt ?? 0) : null;
}

/**
 * True when a guest's lobby should open the running game: a game runs and this device did not
 * come from it — the lobby opened without one (`visitedAt` null) or the host started a new one.
 */
export function shouldFollowIntoGame(
  visitedAt: number | null,
  next: Pick<PartyRoomState, 'status' | 'statusAt' | 'activeGame'>,
): boolean {
  if (next.status !== 'in_game' || !next.activeGame) return false;
  return visitedAt === null || (next.statusAt ?? 0) > visitedAt;
}
