import type { CardPlayer } from './types';

export interface OhHellRoundInput {
  bids: Record<string, number>;
  tricks: Record<string, number>;
  cardsCount: number;
}

export interface OhHellRoundResult {
  updatedPlayers: CardPlayer[];
  playerDeltas: Record<string, number>;
}

export const processOhHellRound = (
  players: CardPlayer[],
  input: OhHellRoundInput,
  scoringRules: {
    correctBidBonus?: number;
    pointsPerTrick?: number;
    diffPenalty?: number;
  } = {},
): OhHellRoundResult => {
  const bonus = scoringRules.correctBidBonus !== undefined ? scoringRules.correctBidBonus : 20;
  const perTrick = scoringRules.pointsPerTrick !== undefined ? scoringRules.pointsPerTrick : 10;
  const penalty = scoringRules.diffPenalty !== undefined ? scoringRules.diffPenalty : 10;

  const playerDeltas: Record<string, number> = {};

  const updatedPlayers = players.map((player) => {
    const bid = input.bids[player.id] !== undefined ? input.bids[player.id] : 0;
    const tricks = input.tricks[player.id] !== undefined ? input.tricks[player.id] : 0;

    let delta = 0;
    if (tricks === bid) {
      // Correct prediction!
      delta = bonus + tricks * perTrick;
    } else {
      // Wrong prediction
      const diff = Math.abs(tricks - bid);
      delta = -(diff * penalty);
    }

    playerDeltas[player.id] = delta;

    return {
      ...player,
      score: player.score + delta,
      bids: [...player.bids, bid],
      tricksWon: [...player.tricksWon, tricks],
      roundScores: [...player.roundScores, delta],
    };
  });

  return {
    updatedPlayers,
    playerDeltas,
  };
};
