import type { PlayerIdentity } from './types';

export interface TurnGameContext {
  players: PlayerIdentity[];
}

export interface TurnRoundContext {
  drawnById?: string;
  drawerIndex?: number;
  guesserId?: string;
  guesserIndex?: number;
  roundNumber?: number;
}

export interface TurnPlayersResult {
  drawer: PlayerIdentity | undefined;
  guesser: PlayerIdentity | undefined;
  drawerIndex: number;
  guesserIndex: number;
}

/**
 * Calculates the effective zero-based player index of the drawer for a given round.
 *
 * Precedence:
 * 1. Explicit `round.drawerIndex` if >= 0
 * 2. Index of `round.drawnById` within `game.players`
 * 3. Round number modulo player count: `(max(1, round.roundNumber) - 1) % (game.players.length || 1)`
 */
export function getEffectiveDrawerIndex(
  game?: TurnGameContext | null,
  round?: TurnRoundContext | null,
): number {
  const players = game?.players || [];
  const playersCount = players.length || 1;
  let dIdx = round?.drawerIndex ?? -1;
  if (dIdx < 0 && round?.drawnById) {
    dIdx = players.findIndex((p) => p.id === round.drawnById);
  }
  return dIdx >= 0
    ? dIdx
    : (Math.max(1, round?.roundNumber ?? 1) - 1) % playersCount;
}

/**
 * Calculates the effective zero-based player index of the guesser for a given round.
 *
 * Precedence:
 * 1. Explicit `round.guesserIndex` if >= 0
 * 2. Index of `round.guesserId` within `game.players`
 * 3. Next player after the drawer: `(drawerIndex + 1) % (game.players.length || 1)`
 */
export function getEffectiveGuesserIndex(
  game?: TurnGameContext | null,
  round?: TurnRoundContext | null,
  drawerIndex?: number,
): number {
  const players = game?.players || [];
  const playersCount = players.length || 1;
  let gIdx = round?.guesserIndex ?? -1;
  if (gIdx < 0 && round?.guesserId) {
    gIdx = players.findIndex((p) => p.id === round.guesserId);
  }
  if (gIdx >= 0) {
    return gIdx;
  }
  const effDrawerIndex = drawerIndex ?? getEffectiveDrawerIndex(game, round);
  return (effDrawerIndex + 1) % playersCount;
}

/**
 * Resolves both the drawer and guesser players along with their indices.
 */
export function getTurnPlayers(
  game?: TurnGameContext | null,
  round?: TurnRoundContext | null,
): TurnPlayersResult {
  const drawerIndex = getEffectiveDrawerIndex(game, round);
  const guesserIndex = getEffectiveGuesserIndex(game, round, drawerIndex);
  const drawer = game?.players?.[drawerIndex];
  const guesser = game?.players?.[guesserIndex];

  return { drawer, guesser, drawerIndex, guesserIndex };
}
