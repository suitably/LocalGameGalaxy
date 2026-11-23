/**
 * Route registry over the game catalogue: pages, nested and standalone routes, per-game
 * settings, lookup by path [ID: LIB-GAME-REGISTRY]
 *
 * Games are declared in their own folder (`definition.tsx`) and collected in
 * `src/lib/catalog/entries.ts` (ADR-0011); this file adds nothing but routing helpers.
 */
import { ROUTE_GAMES } from './catalog/entries';
import type { GameDefinition } from './catalog/types';
import { withGameSettings } from './gameSettingsRegistry';

export type { GameDefinition, GameRouteDefinition } from './catalog/types';
export type { GameSettingsAudience, GameSettingsSectionDefinition } from './gameSettingsTypes';

class GameRegistry {
  private games: GameDefinition[] = ROUTE_GAMES.map(withGameSettings);

  /** Every game with a page, including those without a hub tile. */
  getGames(): GameDefinition[] {
    return this.games;
  }

  findGameByPath(pathname: string): GameDefinition | undefined {
    const clean = pathname.replace(/^\//, '');
    // whole path segments only: `games/melodiq-notes` is not under `games/melodiq` (#620)
    const under = (route: string, r = route.replace(/^\//, '')) =>
      clean === r || clean.startsWith(`${r}/`) || clean.startsWith(`${r}?`);
    return this.games.find(
      (g) =>
        under(g.route) ||
        g.nestedRoutes?.some((nr) => under(nr.path)) ||
        g.standaloneRoutes?.some((sr) => under(sr.path)),
    );
  }
}

export const gameRegistry = new GameRegistry();
