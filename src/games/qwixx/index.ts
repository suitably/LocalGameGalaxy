// The registry's entry point picks single-device or party-room play.
export { QwixxEntry as QwixxGame } from './QwixxEntry';
export { initQwixxI18n } from './i18n';
export * from './logic/types';
export { calculateTotalScore, calculateRowScore } from './logic/qwixxReducer';
export { computeHighlightedNumbers } from './logic/diceHighlight';
export type { DieKey } from './logic/diceHighlight';
