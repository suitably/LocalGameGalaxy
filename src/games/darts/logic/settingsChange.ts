import type { GameSettings } from '../useDartsGame';

interface SetupSnapshot {
  mode: GameSettings['mode'];
  playerIds: readonly string[];
}

/**
 * True when applying the new setup would reset a game that already has progress:
 * `updateSettings` resets on a mode change, `updatePlayers` on a changed roster.
 */
export function setupChangeResetsProgress(
  current: SetupSnapshot,
  next: SetupSnapshot,
  hasProgress: boolean,
): boolean {
  if (!hasProgress) return false;
  const modeChanged = current.mode !== next.mode;
  const rosterChanged =
    current.playerIds.length !== next.playerIds.length ||
    current.playerIds.some((id, i) => id !== next.playerIds[i]);
  return modeChanged || rosterChanged;
}
