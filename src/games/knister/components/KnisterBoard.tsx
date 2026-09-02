import React, { useMemo } from 'react';
import { Box, Paper, Typography, Tooltip, Chip, alpha } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { calculateBoardScores } from '../logic/knisterScoring';
import type { KnisterGrid } from '../logic/types';

interface KnisterBoardProps {
  grid: KnisterGrid;
  currentSum: number | null;
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
}

export const KnisterBoard: React.FC<KnisterBoardProps> = ({
  grid,
  currentSum,
  onCellClick,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const scores = useMemo(() => calculateBoardScores(grid), [grid]);

  const isMainDiag = (r: number, c: number) => r === c;
  const isAntiDiag = (r: number, c: number) => r + c === 4;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: { xs: 1, sm: 2 } }}>
      {/* 5x5 Grid plus Score indicators */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr) auto',
          gridTemplateRows: 'repeat(5, 1fr) auto',
          gap: { xs: 0.8, sm: 1.2 },
          bgcolor: 'rgba(255, 255, 255, 0.03)',
          p: { xs: 1.5, sm: 2.5 },
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: 520,
          width: '100%',
        }}
      >
        {/* Rows and Cells */}
        {grid.map((row, rIdx) => (
          <React.Fragment key={`row-${rIdx}`}>
            {row.map((cell, cIdx) => {
              const inMainDiag = isMainDiag(rIdx, cIdx);
              const inAntiDiag = isAntiDiag(rIdx, cIdx);
              const isCenter = inMainDiag && inAntiDiag;
              const isEmpty = cell === null;
              const canPlace = isEmpty && currentSum !== null && !disabled;

              return (
                <Paper
                  key={`cell-${rIdx}-${cIdx}`}
                  elevation={isEmpty ? 0 : 3}
                  onClick={() => canPlace && onCellClick(rIdx, cIdx)}
                  sx={{
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: '1.25rem', sm: '1.6rem', md: '1.85rem' },
                    fontWeight: 800,
                    borderRadius: 2.5,
                    cursor: canPlace ? 'pointer' : 'default',
                    bgcolor: isEmpty
                      ? canPlace
                        ? 'rgba(255, 183, 77, 0.12)'
                        : 'rgba(255, 255, 255, 0.05)'
                      : 'background.paper',
                    color: isEmpty ? 'text.secondary' : '#fff',
                    border: '2px solid',
                    borderColor: canPlace
                      ? 'warning.main'
                      : isCenter
                      ? '#ab47bc'
                      : inMainDiag || inAntiDiag
                      ? '#7e57c2'
                      : isEmpty
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'divider',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    userSelect: 'none',
                    '&:hover': canPlace
                      ? {
                          transform: 'scale(1.06)',
                          bgcolor: 'rgba(255, 183, 77, 0.25)',
                          borderColor: '#ffa726',
                          boxShadow: '0 0 16px rgba(255, 167, 38, 0.4)',
                        }
                      : {},
                    '&:active': canPlace ? { transform: 'scale(0.96)' } : {},
                  }}
                >
                  {cell !== null ? (
                    cell
                  ) : canPlace ? (
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.4,
                        fontSize: { xs: '0.8rem', sm: '1.1rem' },
                        color: 'warning.light',
                      }}
                    >
                      {currentSum}
                    </Typography>
                  ) : null}

                  {/* Corner indicator for Diagonals */}
                  {(inMainDiag || inAntiDiag) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: isCenter ? '#ab47bc' : '#7e57c2',
                        opacity: 0.7,
                      }}
                    />
                  )}
                </Paper>
              );
            })}

            {/* Row Score Badge */}
            <Tooltip
              title={`${t('games.knister.row')} ${rIdx + 1}: ${t(scores.rows[rIdx].labelKey)} (+${scores.rows[rIdx].points}P)`}
              arrow
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pl: 0.5,
                }}
              >
                <Chip
                  label={`${scores.rows[rIdx].points}`}
                  size="small"
                  color={scores.rows[rIdx].points > 0 ? 'primary' : 'default'}
                  variant={scores.rows[rIdx].points > 0 ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    minWidth: { xs: 28, sm: 36 },
                  }}
                />
              </Box>
            </Tooltip>
          </React.Fragment>
        ))}

        {/* Column Scores Row */}
        {scores.cols.map((colEval, cIdx) => (
          <Tooltip
            key={`col-${cIdx}`}
            title={`${t('games.knister.col')} ${cIdx + 1}: ${t(colEval.labelKey)} (+${colEval.points}P)`}
            arrow
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pt: 0.5,
              }}
            >
              <Chip
                label={`${colEval.points}`}
                size="small"
                color={colEval.points > 0 ? 'secondary' : 'default'}
                variant={colEval.points > 0 ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  minWidth: { xs: 28, sm: 36 },
                }}
              />
            </Box>
          </Tooltip>
        ))}

        {/* Diagonal Scores & Total Combined Badge (Bottom Right) */}
        <Tooltip
          title={`Diagonalen (2x): Hauptdiagonale ${scores.mainDiag.points * 2}P, Nebendiagonale ${scores.antiDiag.points * 2}P`}
          arrow
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pt: 0.5,
              pl: 0.5,
            }}
          >
            <Chip
              label={`🗲 ${scores.mainDiag.points * 2 + scores.antiDiag.points * 2}`}
              size="small"
              sx={{
                bgcolor: alpha('#ab47bc', 0.25),
                color: '#e1bee7',
                border: '1px solid #ab47bc',
                fontWeight: 800,
                fontSize: { xs: '0.7rem', sm: '0.8rem' },
              }}
            />
          </Box>
        </Tooltip>
      </Box>

      {/* Live Total Score */}
      <Box
        sx={{
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'rgba(255, 255, 255, 0.04)',
          px: 3,
          py: 1,
          borderRadius: 50,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {t('games.knister.total_score', 'Gesamtpunkte:')}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 900,
            color: 'primary.light',
          }}
        >
          {scores.totalScore}
        </Typography>
      </Box>
    </Box>
  );
};
