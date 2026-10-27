/**
 * The real sources behind `resolveTableGame`: IndexedDB, starter JSON, companion server
 * [ID: GAME-TABLETOP-SOURCE-LOADERS]
 */
import { storage } from '../../../lib/storage';
import type { GameSourceLoaders } from './gameSource';
import type { RawTabletopGameInput } from './gameValidator';
import { loadServerGame } from './tabletopServerApi';
import { getLocalTemplate, getTabletopGame, getTabletopSession } from './tabletopStorage';

async function fetchStarterGame(gameId: string): Promise<RawTabletopGameInput | null> {
  const res = await fetch(`/games/tabletop/${encodeURIComponent(gameId)}.json`);
  if (!res.ok) return null;
  try {
    return (await res.json()) as RawTabletopGameInput;
  } catch {
    // e.g. an HTML fallback page instead of a starter file
    return null;
  }
}

/** `saveKey` is null when this device does not own the table state (phones in a room). */
export function createGameSourceLoaders(gameId: string, saveKey: string | null): GameSourceLoaders {
  return {
    session: async () => {
      if (!saveKey) return null;
      const session = await getTabletopSession(saveKey);
      return session && session.game.id === gameId ? session.game : null;
    },
    localTemplate: async () => (await getLocalTemplate(gameId))?.game ?? null,
    deviceGame: () => getTabletopGame(gameId),
    starterGame: () => fetchStarterGame(gameId),
    serverGame: storage.isHelperActive() ? () => loadServerGame(gameId) : null,
  };
}
