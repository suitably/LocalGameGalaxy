/**
 * Which player a spectator is watching [ID: HOOK-SPECTATOR-SELECTION]
 *
 * Defaults to the first player and falls back to it when the watched player leaves (#659).
 */
import { useState } from 'react';

export function useSpectatorSelection(playerIds: readonly string[]) {
  const [picked, setPicked] = useState<string | null>(null);
  const watched = picked && playerIds.includes(picked) ? picked : (playerIds[0] ?? null);
  return { watched, watch: setPicked };
}
