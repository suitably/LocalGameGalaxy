import { gameRegistry } from '../../lib/gameRegistry';
import type { GameDefinition } from '../../lib/catalog/types';

/** Games that stay mounted after their first visit (`GameDefinition.keepAlive`, #888). */
export const keepAliveGames = (): GameDefinition[] =>
  gameRegistry.getGames().filter((g) => g.keepAlive);

export const isOnRoute = (game: GameDefinition, pathname: string): boolean =>
  pathname.replace(/\/+$/, '') === `/${game.route}`;

/** Whether the current page is a keep-alive game, rendered by `KeepAliveGames` (not the outlet). */
export const isKeepAlivePath = (pathname: string): boolean =>
  keepAliveGames().some((game) => isOnRoute(game, pathname));
