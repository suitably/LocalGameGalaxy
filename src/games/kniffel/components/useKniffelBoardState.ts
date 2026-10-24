import { useState } from 'react';
import type { KniffelCategory, KniffelPlayer } from '../logic/types';
import { canScoreKniffelBonus } from '../logic/kniffelRows';

export interface SelectedCell {
  category: KniffelCategory;
  playerIdx: number;
}

interface Params {
  players: KniffelPlayer[];
  activePlayerIndex: number;
  possibleScores: Record<KniffelCategory, number>;
  rollCount: number;
  disabled: boolean;
  showDice: boolean;
  onScoreCategory: (category: KniffelCategory, score: number) => void;
}

export const useKniffelBoardState = ({
  players,
  activePlayerIndex,
  possibleScores,
  rollCount,
  disabled,
  showDice,
  onScoreCategory,
}: Params) => {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const handleCellClick = (category: KniffelCategory, playerIdx: number) => {
    if (disabled || playerIdx !== activePlayerIndex) return;
    if (showDice && rollCount === 0) return; // if dice are shown, you must roll first

    // Kniffel bonus is only allowed once a Kniffel is scored and (with dice) another one was rolled
    if (category === 'kniffel_bonus') {
      const kniffel = players[playerIdx].scores.kniffel;
      if (kniffel === null || kniffel === 0) return;
      if (showDice && possibleScores.kniffel_bonus === 0) return;
    }
    setSelectedCell({ category, playerIdx });
  };

  const handleBonusClick = (playerIdx: number) => {
    const allowed = canScoreKniffelBonus({
      disabled,
      isActivePlayer: playerIdx === activePlayerIndex,
      kniffelScore: players[playerIdx].scores.kniffel,
      showDice,
      rollCount,
      possibleBonus: possibleScores.kniffel_bonus,
    });
    if (!allowed) return;
    if (showDice) onScoreCategory('kniffel_bonus', 50);
    else setSelectedCell({ category: 'kniffel_bonus', playerIdx });
  };

  const handleScoreConfirm = (score: number) => {
    if (selectedCell) onScoreCategory(selectedCell.category, score);
    setSelectedCell(null);
  };

  return {
    selectedCell,
    closeModal: () => setSelectedCell(null),
    handleCellClick,
    handleBonusClick,
    handleScoreConfirm,
  };
};
