/**
 * Groups and filters the hub's tiles: one section per area, tools last [ID: LOGIC-HUB-SECTIONS]
 */
import { AREAS, type AreaDefinition } from '../../lib/areas';
import type { CatalogEntry } from '../../lib/catalog/types';
import type { AreaFilter } from './HubAreaFilter';

export interface HubSectionModel<E extends CatalogEntry> {
  /** `area` heads a game section; `tools` is the helpers section. */
  key: AreaDefinition['id'] | 'tools';
  area?: AreaDefinition;
  entries: E[];
}

export function hubSections<E extends CatalogEntry>(
  games: readonly E[],
  tools: readonly E[],
  area: AreaFilter,
  ownDevices: boolean,
): HubSectionModel<E>[] {
  const keep = (e: E) =>
    (area === 'all' || e.area === area) && (!ownDevices || e.modes.includes('party_room'));
  const sections: HubSectionModel<E>[] = AREAS.map((a) => ({
    key: a.id,
    area: a,
    entries: games.filter((e) => e.area === a.id && keep(e)),
  }));
  sections.push({ key: 'tools', entries: tools.filter(keep) });
  return sections.filter((s) => s.entries.length > 0);
}
