import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { KniffelPlayer, KniffelCategory, KniffelScores } from '../logic/types';
import {
  getUpperSectionSum,
  getUpperSectionBonus,
  getLowerSectionSum,
  getTotalScore,
} from '../logic/kniffelScoring';
import { LOWER_ROWS, UPPER_ROWS, canScoreKniffelBonus } from '../logic/kniffelRows';
import { pieceTint } from '../../../lib/pieceTint';
import {
  KniffelBonusRow,
  KniffelRow,
  KniffelScoreCell,
  KniffelSectionLabel,
  KniffelSumRow,
} from './KniffelRows';
import { KniffelScoreModal } from './KniffelScoreModal';
import { gridLine, scoreNumberSx } from './kniffelBoardStyles';
import { useKniffelBoardState } from './useKniffelBoardState';

interface KniffelBoardProps {
  players: KniffelPlayer[];
  activePlayerIndex: number;
  possibleScores: Record<KniffelCategory, number>;
  rollCount: number;
  onScoreCategory: (category: KniffelCategory, score: number) => void;
  onSwitchPlayer: (index: number) => void;
  disabled?: boolean;
  showDice: boolean;
}

type ScoreMap = Record<string, number | null>;
const asMap = (scores: KniffelScores) => scores as unknown as ScoreMap;

export const KniffelBoard: React.FC<KniffelBoardProps> = ({
  players,
  activePlayerIndex,
  possibleScores,
  rollCount,
  onScoreCategory,
  onSwitchPlayer,
  disabled = false,
  showDice,
}) => {
  const { t } = useTranslation();
  const board = useKniffelBoardState({
    players,
    activePlayerIndex,
    possibleScores,
    rollCount,
    disabled,
    showDice,
    onScoreCategory,
  });

  const renderCell = (category: KniffelCategory, playerIdx: number) => {
    const score = players[playerIdx].scores[category];
    const isScored = score !== null;
    const isClickable =
      !disabled && playerIdx === activePlayerIndex && (!showDice || rollCount > 0);
    const highlight = isClickable && showDice && possibleScores[category] > 0 && !isScored;
    return (
      <KniffelScoreCell
        playerIdx={playerIdx}
        value={isScored ? String(score) : null}
        clickable={isClickable}
        highlight={highlight}
        onClick={() => board.handleCellClick(category, playerIdx)}
      />
    );
  };

  const canScoreBonus = (idx: number) =>
    canScoreKniffelBonus({
      disabled,
      isActivePlayer: idx === activePlayerIndex,
      kniffelScore: players[idx].scores.kniffel,
      showDice,
      rollCount,
      possibleBonus: possibleScores.kniffel_bonus,
    });

  const upperSums = players.map((p) => getUpperSectionSum(asMap(p.scores)));
  const upperBonus = players.map((p) => getUpperSectionBonus(asMap(p.scores)));

  const renderRows = (defs: typeof UPPER_ROWS) =>
    defs.map((def) => (
      <KniffelRow key={def.category} def={def} players={players} renderCell={renderCell} />
    ));

  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', borderBottom: gridLine }}>
        <Box sx={{ flex: 2, p: 1 }} />
        {players.map((p, idx) => {
          const isActive = idx === activePlayerIndex;
          return (
            <Box
              key={p.id}
              onClick={() => onSwitchPlayer(idx)}
              sx={{
                flex: 1,
                minWidth: 50,
                textAlign: 'center',
                p: 1,
                borderLeft: gridLine,
                bgcolor: (theme) => pieceTint(theme, idx),
                cursor: 'pointer',
                borderBottom: 2,
                borderBottomColor: isActive ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: (theme) => pieceTint(theme, idx, 0.28) },
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                {p.name}
              </Typography>
              <Typography variant="h6" sx={scoreNumberSx}>
                {getTotalScore(asMap(p.scores))}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <KniffelSectionLabel label={t('games.kniffel.upper_section', 'Oberer Teil')} />
      {renderRows(UPPER_ROWS)}
      <KniffelSumRow label={t('games.kniffel.subtotal', 'Zwischensumme')} values={upperSums} />
      <KniffelSumRow
        label={t('games.kniffel.bonus', 'Bonus ab 63')}
        values={upperBonus.map((b) => (b ? '+35' : '0'))}
      />
      <KniffelSumRow
        label={t('games.kniffel.upper_total', 'Summe oben')}
        values={upperSums.map((sum, i) => sum + upperBonus[i])}
      />

      <KniffelSectionLabel label={t('games.kniffel.lower_section', 'Unterer Teil')} />
      {renderRows(LOWER_ROWS)}
      <KniffelBonusRow
        players={players}
        canScore={canScoreBonus}
        onClick={board.handleBonusClick}
      />
      <KniffelSumRow
        label={t('games.kniffel.lower_total', 'Summe unten')}
        values={players.map((p) => getLowerSectionSum(asMap(p.scores)))}
      />

      <KniffelScoreModal
        cell={board.selectedCell}
        players={players}
        showDice={showDice}
        possibleScores={possibleScores}
        onConfirm={board.handleScoreConfirm}
        onClose={board.closeModal}
      />
    </Paper>
  );
};
