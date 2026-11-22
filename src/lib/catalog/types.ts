/**
 * The game catalogue: one entry per game, tool or place, the single source for every list a
 * screen shows (hub, Spieltisch, party picker) [ID: LIB-CATALOG-TYPES]
 *
 * ADR-0011. Entries live next to their game (`src/games/<id>/definition.tsx`,
 * `src/games/tabletop/catalog.ts`); `src/lib/catalog/` only collects them and derives views.
 */
import type React from 'react';
import type { AreaId } from '../areas';
import type { PieceColor } from '../../themeTokens';
import type { PartyGameType } from '../../features/party/logic/universalPartyManager';
import type { GameSettingsSectionDefinition } from '../gameSettingsTypes';

/** How a game can be played. Independent of where it is listed. */
export type Mode =
  | 'solo' // one person, one device
  | 'pass_and_play' // a group around one device
  | 'party_room' // everyone on their own device in a party room
  | 'async'; // turns over hours or days

/** `game`: something to play. `tool`: helps a real-world game (scores, draws). `place`: opens a hub of its own. */
export type EntryKind = 'game' | 'tool' | 'place';

/** Spieltisch sections, in display order. */
export const SPIELTISCH_SECTIONS = ['starters', 'cards', 'dice', 'trackers'] as const;
export type SpieltischSection = (typeof SPIELTISCH_SECTIONS)[number];

/** Where an entry is listed. `hidden`: reachable by route or party lobby, but no tile. */
export type Listing = 'hub' | SpieltischSection | 'hidden';

export interface CatalogEntry {
  id: string;
  kind: EntryKind;
  /** Area symbol and default colour (DESIGN.md §8.2). */
  area: AreaId;
  /** Accent colour where tiles carry one (Spieltisch, party picker); defaults to the area colour. */
  color?: PieceColor;
  titleKey: string;
  /** Fallback title, also the product name when it is the same in every language. */
  title: string;
  descKey: string;
  modes: readonly Mode[];
  listing: Listing;
  /** Own page, or a Spieltisch game (rule script or preset) opened by its id. */
  launch: { type: 'route'; route: string } | { type: 'tabletop' };
  /** Present when the party lobby can start it; tabletop entries start as `tabletop` + `gameId`. */
  party?: { gameType: PartyGameType; descKey?: string };
}

export interface GameRouteDefinition {
  path: string;
  component: React.ReactNode;
}

/** A catalogue entry with its own page. */
export interface GameDefinition extends CatalogEntry {
  launch: { type: 'route'; route: string };
  /** Route without leading slash, registered in `App.tsx`. */
  route: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  settings?: { sections: GameSettingsSectionDefinition[] };
  nestedRoutes?: GameRouteDefinition[];
  standaloneRoutes?: GameRouteDefinition[];
}
