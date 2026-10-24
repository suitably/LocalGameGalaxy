import type { KniffelCategory } from './types';

export interface KniffelRowDef {
  category: KniffelCategory;
  /** Fallback label (German); the i18n key is `games.kniffel.cat.<category>`. */
  label: string;
  /** Fallback hint (German); the i18n key is `games.kniffel.hint.<category>`. */
  hint: string;
  dieFace?: number;
}

export const UPPER_ROWS: readonly KniffelRowDef[] = [
  { category: 'ones', label: 'Einser', hint: 'Summe aller Einsen', dieFace: 1 },
  { category: 'twos', label: 'Zweier', hint: 'Summe aller Zweien', dieFace: 2 },
  { category: 'threes', label: 'Dreier', hint: 'Summe aller Dreien', dieFace: 3 },
  { category: 'fours', label: 'Vierer', hint: 'Summe aller Vieren', dieFace: 4 },
  { category: 'fives', label: 'Fünfer', hint: 'Summe aller Fünfen', dieFace: 5 },
  { category: 'sixes', label: 'Sechser', hint: 'Summe aller Sechsen', dieFace: 6 },
];

export const LOWER_ROWS: readonly KniffelRowDef[] = [
  { category: 'three_of_a_kind', label: 'Dreierpasch', hint: 'Alle Augen zählen' },
  { category: 'four_of_a_kind', label: 'Viererpasch', hint: 'Alle Augen zählen' },
  { category: 'full_house', label: 'Full House', hint: '3 + 2 gleiche · 25' },
  { category: 'small_straight', label: 'Kleine Straße', hint: '4 in Folge · 30' },
  { category: 'large_straight', label: 'Große Straße', hint: '5 in Folge · 40' },
  { category: 'kniffel', label: 'Kniffel', hint: '5 gleiche · 50' },
  { category: 'chance', label: 'Chance', hint: 'Alle Augen zählen' },
];

export interface BonusClickInput {
  disabled: boolean;
  isActivePlayer: boolean;
  kniffelScore: number | null;
  showDice: boolean;
  rollCount: number;
  possibleBonus: number;
}

/** Whether the extra-Kniffel bonus cell may be scored (dice hidden: manual; dice shown: only after a matching roll). */
export const canScoreKniffelBonus = (i: BonusClickInput): boolean =>
  !i.disabled &&
  i.isActivePlayer &&
  i.kniffelScore !== null &&
  i.kniffelScore > 0 &&
  (!i.showDice || (i.rollCount > 0 && i.possibleBonus > 0));
