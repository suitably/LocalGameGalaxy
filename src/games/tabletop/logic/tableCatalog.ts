/**
 * Games on the "Spieltisch" and how they can be played [ID: LOGIC-TABLETOP-TABLE-CATALOG]
 *
 * Two modes, named by whether the device is shared (it is usually a phone in both):
 * - `shared_device`: one device for everyone, passed around (pass and play);
 * - `own_devices`: a party session that everyone joins with their own device.
 */
import type { TabletopPlayMode } from './types';

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
  icon: string;
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
    icon: '🃏',
    color: '#1976d2',
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'liars-dice',
    kind: 'tabletop',
    titleKey: 'games.tabletop.liars_dice_title',
    title: "Liar's Dice / Perudo",
    descKey: 'games.tabletop.liars_dice_desc',
    icon: '🎲',
    color: '#f57c00',
    // Cups are hands: pass and play keeps them hidden between players.
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'checkers',
    kind: 'tabletop',
    titleKey: 'games.tabletop.checkers_title',
    title: 'Dame / Checkers',
    descKey: 'games.tabletop.checkers_desc',
    icon: '🏁',
    color: '#388e3c',
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
    icon: '🎲',
    color: '#b91c1c',
    modes: ['shared_device'],
  },
  {
    id: 'knister',
    kind: 'route',
    route: '/games/knister',
    titleKey: 'games.knister.title',
    title: 'Knister',
    descKey: 'games.knister.description',
    icon: '🔢',
    color: '#e65100',
    modes: ['shared_device', 'own_devices'],
  },
  {
    id: 'qwixx',
    kind: 'route',
    route: '/games/qwixx',
    titleKey: 'games.qwixx.title',
    title: 'Qwixx',
    descKey: 'games.qwixx.description',
    icon: '🎯',
    color: '#f57c00',
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
