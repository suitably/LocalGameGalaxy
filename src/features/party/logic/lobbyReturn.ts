/**
 * When a guest follows the host back to the party lobby [ID: LOGIC-PARTY-LOBBY-RETURN]
 */
import type { PartyRoomState } from './universalPartyManager';

/** True when the room went from a running game back to the lobby (the host ended the game). */
export function shouldFollowToLobby(
  previous: PartyRoomState['status'] | undefined,
  next: PartyRoomState['status'],
): boolean {
  return previous === 'in_game' && next === 'lobby';
}
