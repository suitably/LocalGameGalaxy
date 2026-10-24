/**
 * Games on the "Spieltisch" and how they can be played [ID: LOGIC-TABLETOP-TABLE-CATALOG]
 *
 * Two modes, named by whether the device is shared (it is usually a phone in both):
 * - `shared_device`: one device for everyone, passed around (pass and play);
 * - `own_devices`: a party session that everyone joins with their own device.
 */
import type { AreaId } from '../../../lib/areas';
import type { TabletopPlayMode } from './types';
import { piecePalette } from '../../../themeTokens';

export type PlayMode = 'shared_device' | 'own_devices';

export interface TableGameEntry {
  id: string;
  /** Tabletop games open in the tabletop engine; others are separate game routes. */
  kind: 'tabletop' | 'route';
  route?: string;
  titleKey: string;
  title: string;
  descKey?: string;
  desc?: string;
  icon: AreaId;
  color: string;
  modes: PlayMode[];
}

/** Our modes for a tabletop game's `supportedModes` (solo counts as one device). */
export function playModesOf(supported: TabletopPlayMode[] | undefined): PlayMode[] {
  const modes = new Set<PlayMode>();
  for (const mode of supported ?? []) {
    modes.add(mode === 'party_multi_device' ? 'own_devices' : 'shared_device');
  }
  return modes.size > 0 ? [...modes] : ['shared_device', 'own_devices'];
}

export const TABLETOP_STARTERS: TableGameEntry[] = [
  {
    id: 'standard-cards',
    kind: 'tabletop',
    titleKey: 'games.tabletop.standard_cards_title',
    title: 'Standard Kartendeck (52)',
    descKey: 'games.tabletop.standard_cards_desc',
    icon: 'cards',
    color: piecePalette.blue,
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'liars-dice',
    kind: 'tabletop',
    titleKey: 'games.tabletop.liars_dice_title',
    title: "Liar's Dice / Perudo",
    descKey: 'games.tabletop.liars_dice_desc',
    icon: 'dice',
    color: piecePalette.orange,
    // Cups are hands: pass and play keeps them hidden between players.
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'checkers',
    kind: 'tabletop',
    titleKey: 'games.tabletop.checkers_title',
    title: 'Dame / Checkers',
    descKey: 'games.tabletop.checkers_desc',
    icon: 'puzzle',
    color: piecePalette.green,
    modes: ['shared_device', 'own_devices'],
  },
];

/** Dice games with their own score sheets; with own devices once they sync (#467 slice 5). */
export const DICE_GAMES: TableGameEntry[] = [
  {
    id: 'kniffel',
    kind: 'route',
    route: '/games/kniffel',
    titleKey: 'games.kniffel.title',
    title: 'Kniffel',
    descKey: 'games.kniffel.description',
    icon: 'dice',
    color: piecePalette.red,
    modes: ['shared_device'],
  },
  {
    id: 'knister',
    kind: 'route',
    route: '/games/knister',
    titleKey: 'games.knister.title',
    title: 'Knister',
    descKey: 'games.knister.description',
    icon: 'puzzle',
    color: piecePalette.orange,
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'qwixx',
    kind: 'route',
    route: '/games/qwixx',
    titleKey: 'games.qwixx.title',
    title: 'Qwixx',
    descKey: 'games.qwixx.description',
    icon: 'dice',
    color: piecePalette.orange,
    modes: ['shared_device'],
  },
];

/** Where a game in a mode opens; `own_devices` goes through the party lobby. */
export function routeFor(
  entry: Pick<TableGameEntry, 'id' | 'kind' | 'route'>,
  mode: PlayMode,
): string {
  if (entry.kind === 'route')
    // Dice games with a room mode go through the party lobby; the host starts them there.
    return mode === 'own_devices' ? `/party?launch=${entry.id}` : entry.route || '/';
  return mode === 'shared_device'
    ? `/games/tabletop?local=1&gameId=${encodeURIComponent(entry.id)}`
    : `/party?launch=tabletop&gameId=${encodeURIComponent(entry.id)}`;
}
