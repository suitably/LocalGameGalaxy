/**
 * Views of the game catalogue: every list a screen shows is one of these (ADR-0011)
 * [ID: LIB-CATALOG-VIEWS]
 */
import { AREAS } from '../areas';
import { piecePalette } from '../../themeTokens';
import type { PartyGameType } from '../../features/party/logic/universalPartyManager';
import { CATALOG, ROUTE_GAMES } from './entries';
import type { CatalogEntry, Listing } from './types';

const listed = (e: CatalogEntry) => e.listing !== 'hidden';
/** Places (the Spieltisch) close their area, after its games. */
const placesLast = (a: CatalogEntry, b: CatalogEntry) =>
  Number(a.kind === 'place') - Number(b.kind === 'place');

/** Game tiles of the hub (Spieltisch games included), in catalogue order, places last. */
export const hubGames = (): CatalogEntry[] =>
  CATALOG.filter((e) => listed(e) && e.kind !== 'tool').sort(placesLast);

/** Tool tiles of the hub (score keepers, draws), shown apart from the games. */
export const hubTools = (): CatalogEntry[] => CATALOG.filter((e) => listed(e) && e.kind === 'tool');

/** The page of a route entry by id (the party room's entry, for the hub's room button). */
export const routeOf = (id: string): string | undefined =>
  ROUTE_GAMES.find((g) => g.id === id)?.launch.route;

/** Entries listed in one place (a Spieltisch section, the hub, or hidden ones). */
export const entriesIn = (listing: Listing): CatalogEntry[] =>
  CATALOG.filter((e) => e.listing === listing);

export const findEntry = (id: string | null | undefined): CatalogEntry | undefined =>
  id ? CATALOG.find((e) => e.id === id) : undefined;

/** Accent colour (hex) of an entry: its own, else its area's. */
export function entryColor(entry: Pick<CatalogEntry, 'area' | 'color'>): string {
  const key = entry.color ?? AREAS.find((a) => a.id === entry.area)?.color ?? 'pink';
  return piecePalette[key];
}

/**
 * Party picker tabs: `party` = games made for a room (party and music areas),
 * `table` = card, board and dice games.
 */
export type PartyPickerTab = 'party' | 'table';

export function partyPickerEntries(tab: PartyPickerTab): CatalogEntry[] {
  const inTab = (e: CatalogEntry) =>
    (e.area === 'party' || e.area === 'music') === (tab === 'party');
  // The table tab follows the Spieltisch order (starters, cards, dice), like the Spieltisch.
  const order = (e: CatalogEntry) => ['starters', 'cards', 'dice'].indexOf(e.listing);
  const entries = CATALOG.filter((e) => e.party && inTab(e));
  return tab === 'table' ? [...entries].sort((a, b) => order(a) - order(b)) : entries;
}

/** Party game types the lobby starts by `launch=<type>` alone (tabletop also needs `gameId`). */
export const launchablePartyTypes = (): PartyGameType[] =>
  ROUTE_GAMES.flatMap((g) => (g.party ? [g.party.gameType] : []));

/** The entry a party room plays: a Spieltisch game by `gameId`, else the route game of the type. */
export function partyEntry(
  gameType: PartyGameType | null | undefined,
  gameId?: string | null,
): CatalogEntry | undefined {
  if (gameType === 'tabletop') return findEntry(gameId);
  return ROUTE_GAMES.find((g) => g.party?.gameType === gameType);
}
