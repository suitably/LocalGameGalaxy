/**
 * types.ts - Wordle Game Types and State Definitions
 */

export type LetterStatus = 'empty' | 'tbd' | 'correct' | 'present' | 'absent';

export interface EvaluatedLetter {
  char: string;
  status: LetterStatus;
}

export type WordleGameMode = 'daily' | 'practice' | 'duel';

export interface WordleStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
  };
  lastCompletedDate?: string;
}

export interface WordleState {
  targetWord: string;
  guesses: string[];
  evaluations: EvaluatedLetter[][];
  currentInput: string;
  status: 'playing' | 'won' | 'lost';
  mode: WordleGameMode;
  dateKey: string;
  invalidWordShake: boolean;
  message: string | null;
}
