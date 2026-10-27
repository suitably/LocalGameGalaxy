/**
 * Where a table's game comes from, and which state a table starts with [ID: GAME-TABLETOP-SOURCE]
 *
 * Order: running session → device game (`custom_games`) → starter JSON → companion server.
 * A device-only or starter game may have a default template on this device (#547); a new table
 * of such a game starts from it. Server games use the server's template and never a local one.
 */
import { validateAndSanitizeGame, type RawTabletopGameInput } from './gameValidator';
import type { TabletopGameDefinition } from './types';

/** `device`: saved in `custom_games`; `starter`: `public/games/tabletop/<id>.json`. */
export type TableOrigin = 'device' | 'starter' | 'server';

export interface GameSourceLoaders {
  /** The saved session of this table, already checked to belong to this game. */
  session: () => Promise<TabletopGameDefinition | null>;
  localTemplate: () => Promise<TabletopGameDefinition | null>;
  deviceGame: () => Promise<TabletopGameDefinition | null>;
  starterGame: () => Promise<RawTabletopGameInput | null>;
  /** null when no companion server is configured. */
  serverGame: (() => Promise<TabletopGameDefinition>) | null;
}

export interface ResolvedTable {
  game: TabletopGameDefinition;
  /** null for a resumed session whose game no longer exists here (e.g. server not configured). */
  origin: TableOrigin | null;
  startedFrom: 'session' | 'template' | 'original';
}

/** Whether the table may be stored as (or reset from) a default template on this device. */
export const supportsLocalTemplate = (origin: TableOrigin | null): boolean =>
  origin === 'device' || origin === 'starter';

/** Finds the original game; `loadServer` is false when only its origin is needed. */
async function findOriginal(
  loaders: GameSourceLoaders,
  loadServer: boolean,
): Promise<{ origin: TableOrigin; game: TabletopGameDefinition | null } | null> {
  const device = await loaders.deviceGame();
  if (device) return { origin: 'device', game: validateAndSanitizeGame(device) };
  const starter = await loaders.starterGame();
  if (starter) return { origin: 'starter', game: validateAndSanitizeGame(starter) };
  if (!loaders.serverGame) return null;
  return { origin: 'server', game: loadServer ? await loaders.serverGame() : null };
}

/** Resolves the game of a table; null when no source knows the game id. */
export async function resolveTableGame(
  gameId: string,
  loaders: GameSourceLoaders,
): Promise<ResolvedTable | null> {
  const session = await loaders.session();
  if (session) {
    const original = await findOriginal(loaders, false);
    return { game: session, origin: original?.origin ?? null, startedFrom: 'session' };
  }

  const original = await findOriginal(loaders, true);
  if (!original?.game) return null;

  if (supportsLocalTemplate(original.origin)) {
    const template = await loaders.localTemplate();
    if (template) {
      return {
        game: validateAndSanitizeGame({ ...template, id: gameId }),
        origin: original.origin,
        startedFrom: 'template',
      };
    }
  }
  return { game: original.game, origin: original.origin, startedFrom: 'original' };
}
