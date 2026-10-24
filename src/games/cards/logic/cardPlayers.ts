import type { CardPlayer } from './types';

/** Fresh roster for a card session; ids are `p1`, `p2`, … in seat order. */
export const createCardPlayers = (names: string[], lives = 0): CardPlayer[] =>
  names.map((name, idx) => ({
    id: `p${idx + 1}`,
    name,
    lives,
    isSwimming: false,
    isEliminated: false,
    score: 0,
    roundScores: [],
    bids: [],
    tricksWon: [],
  }));

/** Players sorted by score, highest first (stable for ties). Does not mutate the input. */
export const rankPlayersByScore = (players: CardPlayer[]): CardPlayer[] =>
  [...players].sort((a, b) => b.score - a.score);

/** `+5` for zero and positive values, `-3` for negative ones. */
export const formatSignedPoints = (value: number): string =>
  value >= 0 ? `+${value}` : `${value}`;

/** Parses a free-text count input; empty or invalid text counts as 0. */
export const parseCountInput = (raw: string | undefined): number => parseInt(raw ?? '', 10) || 0;

/** Sum of all entered counts (e.g. the total of all bids in an Oh Hell round). */
export const sumCountInputs = (inputs: Record<string, string>): number =>
  Object.values(inputs).reduce((acc, raw) => acc + parseCountInput(raw), 0);

/** Converts per-player text inputs to numbers for the round engines. */
export const toCountMap = (
  players: CardPlayer[],
  inputs: Record<string, string>,
): Record<string, number> =>
  Object.fromEntries(players.map((p) => [p.id, parseCountInput(inputs[p.id])]));
