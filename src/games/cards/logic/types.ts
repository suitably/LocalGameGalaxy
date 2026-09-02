export type CardTrackerType = 'lives_elimination' | 'bids_and_tricks' | 'score_accumulator';

export interface CardGameDefinition {
  id: string;
  name: string;
  nameKey?: string;
  description: string;
  descriptionKey?: string;
  trackerType: CardTrackerType;
  defaultLives?: number;
  minPlayers?: number;
  maxPlayers?: number;
  icon?: string;
  color?: string;
  isCustom?: boolean;
  author?: string;
  scoringRules?: {
    correctBidBonus?: number;
    pointsPerTrick?: number;
    diffPenalty?: number;
    feuerPoints?: number;
    allowEqualBidsAndCards?: boolean;
    roundsSequence?: number[];
  };
}

export interface CardPlayer {
  id: string;
  name: string;
  lives: number;
  isSwimming: boolean;
  isEliminated: boolean;
  score: number;
  roundScores: number[];
  bids: number[];
  tricksWon: number[];
}

export interface CardGameState {
  selectedGameId: string;
  gameDefinition: CardGameDefinition;
  players: CardPlayer[];
  roundNumber: number;
  currentPhase: 'bidding' | 'scoring' | 'round_over' | 'game_over';
  currentRoundBids: Record<string, number>;
  currentRoundScoresOrTricks: Record<string, number>;
  currentRoundCardsCount: number;
  history: Array<{
    round: number;
    cardsCount?: number;
    results: Array<{
      playerId: string;
      name: string;
      value: number; // points or tricks
      bid?: number;
      deltaScore?: number;
      livesLost?: boolean;
      status: 'active' | 'swimming' | 'eliminated';
    }>;
  }>;
  isGameOver: boolean;
  winner: CardPlayer | null;
}
