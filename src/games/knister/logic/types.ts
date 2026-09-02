export type CombinationType =
  | 'none'
  | 'pair'
  | 'two_pairs'
  | 'triple'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_with_seven'
  | 'straight_without_seven'
  | 'five_of_a_kind';

export interface LineEvaluation {
  type: CombinationType;
  points: number;
  labelKey: string;
  isComplete: boolean;
}

export interface BoardScores {
  rows: LineEvaluation[];
  cols: LineEvaluation[];
  mainDiag: LineEvaluation;
  antiDiag: LineEvaluation;
  totalScore: number;
}

export type KnisterGrid = (number | null)[][];

export interface KnisterPlayer {
  id: string;
  name: string;
  grid: KnisterGrid;
  isFilled: boolean;
}

export interface KnisterState {
  players: KnisterPlayer[];
  activePlayerIndex: number;
  currentRoll: { die1: number; die2: number; sum: number } | null;
  rollCount: number;
  rollHistory: { die1: number; die2: number; sum: number }[];
  isRolling: boolean;
  isGameOver: boolean;
  highScore: number;
}

export type KnisterAction =
  | { type: 'ROLL_DICE'; die1: number; die2: number }
  | { type: 'PLACE_NUMBER'; row: number; col: number; playerId?: string }
  | { type: 'NEW_GAME' }
  | { type: 'SET_PLAYERS'; names: string[] }
  | { type: 'SWITCH_PLAYER'; index: number };
