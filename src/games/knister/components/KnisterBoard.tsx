import React, { useMemo } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import { useTranslation } from 'react-i18next';
import { calculateBoardScores } from '../logic/knisterScoring';
import type { KnisterGrid } from '../logic/types';
import { fontFamilies } from '../../../themeTokens';
import { pieceTint } from '../../../lib/pieceTint';
import { KnisterCell } from './KnisterCell';
import { KnisterScoreChip } from './KnisterScoreChip';

interface KnisterBoardProps {
  grid: KnisterGrid;
  currentSum: number | null;
  selectedNumber?: number | null;
  targetPickerCell?: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
  onCellOpenPicker?: (row: number, col: number) => void;
  disabled?: boolean;
  /** Seat of the player whose grid is shown; tints the board in that player's piece colour. */
  playerSlot?: number;
}

export const KnisterBoard: React.FC<KnisterBoardProps> = ({
  grid,
  currentSum,
  selectedNumber = null,
  targetPickerCell = null,
  onCellClick,
  onCellOpenPicker,
  disabled = false,
  playerSlot,
}) => {
  const { t } = useTranslation();
  const scores = useMemo(() => calculateBoardScores(grid), [grid]);
  const activeSum = currentSum ?? selectedNumber;

  const handleCellAction = (row: number, col: number) => {
    if (disabled) return;
    if (activeSum === null && onCellOpenPicker) onCellOpenPicker(row, col);
    else onCellClick(row, col);
  };

  const diagPoints = (scores.mainDiag.points + scores.antiDiag.points) * 2;

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: { xs: 1, sm: 2 } }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr) auto',
          gridTemplateRows: 'repeat(5, 1fr) auto',
          gap: { xs: 0.8, sm: 1.2 },
          bgcolor: (theme) =>
            playerSlot === undefined ? theme.palette.action.hover : pieceTint(theme, playerSlot),
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 5,
          border: 1,
          borderColor: 'divider',
          maxWidth: 520,
          width: '100%',
        }}
      >
        {grid.map((row, rIdx) => (
          <React.Fragment key={`row-${rIdx}`}>
            {row.map((cell, cIdx) => {
              const onMain = rIdx === cIdx;
              const onAnti = rIdx + cIdx === 4;
              return (
                <KnisterCell
                  key={`cell-${rIdx}-${cIdx}`}
                  value={cell}
                  onDiagonal={onMain || onAnti}
                  isCenter={onMain && onAnti}
                  interactive={cell === null && !disabled}
                  hasActiveSum={activeSum !== null}
                  activeSum={activeSum}
                  isTargetPicker={targetPickerCell?.row === rIdx && targetPickerCell?.col === cIdx}
                  onActivate={() => handleCellAction(rIdx, cIdx)}
                />
              );
            })}
            <KnisterScoreChip
              title={`${t('games.knister.row')} ${rIdx + 1}: ${t(scores.rows[rIdx].labelKey)} (+${scores.rows[rIdx].points}P)`}
              points={scores.rows[rIdx].points}
              color="primary"
              wrapperSx={{ pl: 0.5 }}
            />
          </React.Fragment>
        ))}

        {scores.cols.map((colEval, cIdx) => (
          <KnisterScoreChip
            key={`col-${cIdx}`}
            title={`${t('games.knister.col')} ${cIdx + 1}: ${t(colEval.labelKey)} (+${colEval.points}P)`}
            points={colEval.points}
            color="secondary"
            wrapperSx={{ pt: 0.5 }}
          />
        ))}

        <Tooltip
          title={t('games.knister.diagonals_tooltip', {
            main: scores.mainDiag.points * 2,
            anti: scores.antiDiag.points * 2,
          })}
          arrow
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pt: 0.5,
              pl: 0.5,
            }}
          >
            <Chip
              icon={<BoltIcon />}
              label={diagPoints}
              size="small"
              variant="outlined"
              color="secondary"
              sx={{
                fontFamily: fontFamilies.display,
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 800,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            />
          </Box>
        </Tooltip>
      </Box>

      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'action.hover',
          px: 3,
          py: 1,
          borderRadius: 9999,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {t('games.knister.total_score', 'Gesamtpunkte:')}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontFamily: fontFamilies.display,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: 'primary.main',
          }}
        >
          {scores.totalScore}
        </Typography>
      </Box>
    </Box>
  );
};
