/**
 * Schwimmen table settings and the checks they need [ID: LOGIC-TABLETOP-SCRIPT-SCHWIMMEN-RULES]
 */
import { rankOf } from './cardDeck';
import { optionOn, type ScriptOption, type ScriptOptions } from './scriptTypes';
import type { SchwimmenState } from './schwimmen';

/** House rules chosen at setup; all off keeps the original behaviour. */
export type SchwimmenRules = {
  passOnce: boolean;
  firstSwims: boolean;
  /** Missing in sessions saved before it existed: off. */
  newMiddle?: boolean;
};

export const SCHWIMMEN_OPTIONS: readonly ScriptOption[] = [
  { id: 'passOnce', label: 'schwimmen.option.passOnce', hint: 'schwimmen.option.passOnceHint' },
  {
    id: 'firstSwims',
    label: 'schwimmen.option.firstSwims',
    hint: 'schwimmen.option.firstSwimsHint',
  },
  {
    id: 'newMiddle',
    label: 'schwimmen.option.newMiddle',
    hint: 'schwimmen.option.newMiddleHint',
    default: true,
  },
];

export const rulesOf = (options?: ScriptOptions): SchwimmenRules => ({
  passOnce: optionOn(SCHWIMMEN_OPTIONS, options, 'passOnce'),
  firstSwims: optionOn(SCHWIMMEN_OPTIONS, options, 'firstSwims'),
  newMiddle: optionOn(SCHWIMMEN_OPTIONS, options, 'newMiddle'),
});

const LOW_MIDDLE = ['7', '8', '9'];

/** Whether the seat to act may have the middle replaced: 7, 8 and 9 lie there (rule `newMiddle`). */
export function canRenewMiddle(s: SchwimmenState): boolean {
  if (s.phase !== 'play' || s.rules?.newMiddle !== true || s.renewed === true) return false;
  if (s.stock.length < 3 || s.middle.length !== 3) return false;
  const ranks = s.middle.map(rankOf);
  return LOW_MIDDLE.every((r) => ranks.includes(r));
}

/** Whether `seat` may still pass in this deal. */
export const canPass = (s: SchwimmenState, seat: number): boolean =>
  !(s.rules?.passOnce === true && s.passed?.[seat] === true);

/** Lives after losing a round: the last life leads to swimming, or out once someone swam. */
export function livesAfterLoss(lives: number, firstSwims: boolean, swum: boolean): number {
  return lives === 1 && firstSwims && swum ? -1 : lives - 1;
}
