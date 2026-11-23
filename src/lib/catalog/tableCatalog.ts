/**
 * Games on the "Spieltisch" and how they can be played [ID: LOGIC-TABLETOP-TABLE-CATALOG]
 *
 * The games themselves come from the catalogue (ADR-0011); this file only maps them to the
 * Spieltisch's two play modes, named by whether the device is shared (usually a phone in both):
 * - `shared_device`: one device for everyone, passed around (pass and play, or solo);
 * - `own_devices`: a party session that everyone joins with their own device.
 */
import type { AreaId } from '../areas';
import type { CatalogEntry, Mode, SpieltischSection } from './types';
import { entriesIn, entryColor } from './views';

/** Play modes a tabletop game declares it supports (re-exported by the tabletop engine types). */
export type TabletopPlayMode = 'party_multi_device' | 'local_pass_and_play' | 'solo';

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

export function playModesOf(supported: TabletopPlayMode[] | undefined): PlayMode[] {
  const modes = new Set<PlayMode>();
  for (const mode of supported ?? []) {
    modes.add(mode === 'party_multi_device' ? 'own_devices' : 'shared_device');
  }
  return modes.size > 0 ? [...modes] : ['shared_device', 'own_devices'];
}

/** Catalogue modes as Spieltisch play modes (async play is not offered here). */
export function tableModesOf(modes: readonly Mode[]): PlayMode[] {
  const out: PlayMode[] = [];
  if (modes.some((m) => m === 'solo' || m === 'pass_and_play')) out.push('shared_device');
  if (modes.includes('party_room')) out.push('own_devices');
  return out;
}

export function toTableEntry(entry: CatalogEntry): TableGameEntry {
  return {
    id: entry.id,
    kind: entry.launch.type === 'tabletop' ? 'tabletop' : 'route',
    route: entry.launch.type === 'route' ? entry.launch.route : undefined,
    titleKey: entry.titleKey,
    title: entry.title,
    descKey: entry.descKey,
    icon: entry.area,
    color: entryColor(entry),
    modes: tableModesOf(entry.modes),
  };
}

/** One Spieltisch section, in catalogue order. */
export const spieltischSection = (section: SpieltischSection): TableGameEntry[] =>
  entriesIn(section).map(toTableEntry);

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
