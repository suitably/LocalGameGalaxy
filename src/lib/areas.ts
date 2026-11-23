import type { PiecePalette } from '../themeTokens';

/** Hub areas (DESIGN.md §8.2): the groups every catalogue entry belongs to. */
export type AreaId = 'music' | 'dice' | 'cards' | 'party' | 'puzzle';

export interface AreaDefinition {
  id: AreaId;
  /** Key into `theme.palette.piece`. */
  color: Exclude<keyof PiecePalette, 'contrastText'>;
  /** Label shown in the hub filter (reuses the category keys). */
  labelKey: string;
}

export const AREAS: readonly AreaDefinition[] = [
  { id: 'party', color: 'pink', labelKey: 'hub.categories.party' },
  { id: 'music', color: 'blue', labelKey: 'hub.categories.music' },
  { id: 'cards', color: 'green', labelKey: 'hub.categories.cards' },
  { id: 'dice', color: 'red', labelKey: 'hub.categories.dice' },
  { id: 'puzzle', color: 'purple', labelKey: 'hub.categories.puzzle' },
];

export const areaById = (id: AreaId): AreaDefinition => AREAS.find((a) => a.id === id) ?? AREAS[0];

/** Areas that contain at least one of the given entries, in `AREAS` order. */
export function areasFor(entries: readonly { area: AreaId }[]): AreaDefinition[] {
  const used = new Set(entries.map((e) => e.area));
  return AREAS.filter((a) => used.has(a.id));
}
