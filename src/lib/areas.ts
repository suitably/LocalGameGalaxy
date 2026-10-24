import type { GameCategory } from './gameRegistry';
import type { PiecePalette } from '../themeTokens';

/** Hub areas (DESIGN.md §8.2): five umbrella groups over the game categories. */
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

const AREA_BY_CATEGORY: Record<Exclude<GameCategory, 'all'>, AreaId> = {
  music: 'music',
  dice: 'dice',
  cards: 'cards',
  party: 'party',
  drawing: 'party',
  social_deduction: 'party',
  puzzle: 'puzzle',
};

export function areaOfCategory(category: Exclude<GameCategory, 'all'>): AreaDefinition {
  const id = AREA_BY_CATEGORY[category];
  return AREAS.find((a) => a.id === id) ?? AREAS[0];
}

/** Areas that contain at least one of the given categories, in `AREAS` order. */
export function areasFor(categories: readonly Exclude<GameCategory, 'all'>[]): AreaDefinition[] {
  const used = new Set(categories.map((c) => AREA_BY_CATEGORY[c]));
  return AREAS.filter((a) => used.has(a.id));
}
