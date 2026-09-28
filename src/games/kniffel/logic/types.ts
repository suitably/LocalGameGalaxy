export type KniffelCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'three_of_a_kind'
  | 'four_of_a_kind'
  | 'full_house'
  | 'small_straight'
  | 'large_straight'
  | 'kniffel'
  | 'chance'
  | 'kniffel_bonus';

export interface KniffelScores {
  ones: number | null;
  twos: number | null;
  threes: number | null;
  fours: number | null;
  fives: number | null;
  sixes: number | null;
  three_of_a_kind: number | null;
  four_of_a_kind: number | null;
  full_house: number | null;
  small_straight: number | null;
  large_straight: number | null;
  kniffel: number | null;
  chance: number | null;
  kniffel_bonus: number | null; // Tracks number of bonuses (e.g. 0, 1, 2...)
}

export interface KniffelPlayer {
  id: string;
  name: string;
  scores: KniffelScores;
}

export interface KniffelState {
  players: KniffelPlayer[];
  activePlayerIndex: number;
  dice: number[];
  heldDice: boolean[];
  rollCount: number;
  isGameOver: boolean;
}

export type KniffelAction =
  | { type: 'ROLL_DICE'; dice: number[] }
  | { type: 'TOGGLE_HOLD_DIE'; index: number }
  | { type: 'SCORE_CATEGORY'; category: KniffelCategory; score: number }
  | { type: 'NEW_GAME' }
  | { type: 'SET_PLAYERS'; names: string[] }
  | { type: 'SWITCH_PLAYER'; index: number };
