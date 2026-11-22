/**
 * Catalogue entries of the Spieltisch games without a page of their own: presets of the free
 * table and the rule-scripted card games (ADR-0011) [ID: CATALOG-TABLETOP]
 *
 * Pure data; ids match `scriptRegistry.ts` (card games) and the built-in presets.
 */
import type { CatalogEntry } from '../../lib/catalog/types';
import type { AreaId } from '../../lib/areas';
import type { PieceColor } from '../../themeTokens';

const TABLE_MODES = ['pass_and_play', 'party_room'] as const;

const starter = (id: string, i18n: string, title: string, area: AreaId, color: PieceColor) =>
  ({
    id,
    kind: 'game',
    area,
    color,
    titleKey: `games.tabletop.${i18n}_title`,
    title,
    descKey: `games.tabletop.${i18n}_desc`,
    modes: TABLE_MODES,
    listing: 'starters',
    launch: { type: 'tabletop' },
    party: { gameType: 'tabletop' },
  }) satisfies CatalogEntry;

const cardGame = (id: string, title: string, color: PieceColor) =>
  ({
    id,
    kind: 'game',
    area: 'cards',
    color,
    titleKey: `games.tabletop.scripted.games.${id}.title`,
    title,
    descKey: `games.tabletop.scripted.games.${id}.desc`,
    modes: TABLE_MODES,
    listing: 'cards',
    launch: { type: 'tabletop' },
    party: { gameType: 'tabletop' },
  }) satisfies CatalogEntry;

export const TABLETOP_ENTRIES: CatalogEntry[] = [
  starter('standard-cards', 'standard_cards', 'Standard Kartendeck (52)', 'cards', 'blue'),
  // Cups are hands: pass and play keeps them hidden between players.
  starter('liars-dice', 'liars_dice', "Liar's Dice / Perudo", 'dice', 'orange'),
  starter('checkers', 'checkers', 'Dame / Checkers', 'puzzle', 'green'),
  cardGame('schwimmen', 'Schwimmen', 'teal'),
  cardGame('durak', 'Durak', 'red'),
  cardGame('arschloch', 'Arschloch', 'purple'),
  cardGame('skat', 'Skat', 'blue'),
  cardGame('maumau', 'Mau-Mau', 'orange'),
  cardGame('schwarzer-peter', 'Schwarzer Peter', 'green'),
  cardGame('golf', 'Golf', 'teal'),
  cardGame('cabo', 'Cabo', 'purple'),
];
