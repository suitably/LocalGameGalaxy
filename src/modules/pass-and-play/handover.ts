/**
 * Pass and play on one device: whose turn is next and the handover state [ID: MOD-PASS-AND-PLAY-LOGIC]
 *
 * One tap on "switch player" covers the screen for the next player (anything private stays
 * hidden); a tap on the cover reveals it for them. The cover can be pointed at another player.
 */

export interface HandoverPlayer {
  id: string;
  name: string;
  color?: string;
}

export type HandoverState = { phase: 'playing' } | { phase: 'covered'; playerId: string };

/** The player after `currentId` in turn order (first player when none is active). */
export function nextPlayerId(players: HandoverPlayer[], currentId?: string | null): string | null {
  if (players.length === 0) return null;
  const index = players.findIndex((p) => p.id === currentId);
  return players[(index + 1) % players.length].id;
}

export type HandoverAction =
  | { type: 'START'; players: HandoverPlayer[]; currentId?: string | null }
  | { type: 'RETARGET'; playerId: string }
  | { type: 'REVEAL' }
  | { type: 'CANCEL' };

export function handoverReducer(state: HandoverState, action: HandoverAction): HandoverState {
  switch (action.type) {
    case 'START': {
      const playerId = nextPlayerId(action.players, action.currentId);
      return playerId ? { phase: 'covered', playerId } : state;
    }
    case 'RETARGET':
      return state.phase === 'covered' ? { phase: 'covered', playerId: action.playerId } : state;
    case 'REVEAL':
    case 'CANCEL':
      return { phase: 'playing' };
  }
}
