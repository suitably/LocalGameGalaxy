/**
 * SudokuGrid.tsx - 9x9 Interactive Grid with 3x3 Block Borders and Smart Highlighting
 */

import React from 'react';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import type { SudokuGridData } from '../logic/types';

interface SudokuGridProps {
  grid: SudokuGridData;
  selectedCell: { row: number; col: number } | null;
  onSelectCell: (row: number, col: number) => void;
  isPaused?: boolean;
}

export const SudokuGrid: React.FC<SudokuGridProps> = ({
  grid,
  selectedCell,
  onSelectCell,
  isPaused = false,
}) => {
  const theme = useTheme();
  const { palette } = theme;
  const selectedValue = selectedCell ? grid[selectedCell.row][selectedCell.col].value : 0;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(9, 1fr)',
        gap: '1px',
        width: '100%',
        maxWidth: { xs: 360, sm: 440, md: 480 },
        aspectRatio: '1 / 1',
        bgcolor: 'background.paper',
        border: (theme) => `3px solid ${theme.palette.secondary.main}`,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {isPaused && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.95),
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'secondary.main' }}>
            PAUSE
          </Typography>
        </Box>
      )}

      {grid.flatMap((row, rIdx) =>
        row.map((cell, cIdx) => {
          const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
          const isSameRow = selectedCell?.row === rIdx;
          const isSameCol = selectedCell?.col === cIdx;
          const isSameBlock =
            selectedCell &&
            Math.floor(selectedCell.row / 3) === Math.floor(rIdx / 3) &&
            Math.floor(selectedCell.col / 3) === Math.floor(cIdx / 3);

          const isSameNumber = selectedValue > 0 && cell.value === selectedValue;
          const isRelated = isSameRow || isSameCol || isSameBlock;

          // 3x3 block borders
          const blockBorder = `2px solid ${palette.text.disabled}`;
          const borderRight = cIdx % 3 === 2 && cIdx !== 8 ? blockBorder : undefined;
          const borderBottom = rIdx % 3 === 2 && rIdx !== 8 ? blockBorder : undefined;

          let cellBg = palette.background.paper;
          if (cell.isError) {
            cellBg = alpha(palette.error.main, 0.35);
          } else if (isSelected) {
            cellBg = palette.secondary.main;
          } else if (isSameNumber) {
            cellBg = alpha(palette.secondary.main, 0.3);
          } else if (isRelated) {
            cellBg = palette.action.hover;
          }

          return (
            <Box
              key={`${rIdx}-${cIdx}`}
              onClick={() => onSelectCell(rIdx, cIdx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: cellBg,
                borderRight,
                borderBottom,
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                '&:hover': {
                  filter: 'brightness(1.2)',
                },
              }}
            >
              {cell.value > 0 ? (
                <Typography
                  sx={{
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                    fontWeight: cell.isInitial ? 800 : 600,
                    color: cell.isError
                      ? 'error.main'
                      : isSelected
                        ? 'secondary.contrastText'
                        : cell.isInitial
                          ? 'text.primary'
                          : 'secondary.main',
                  }}
                >
                  {cell.value}
                </Typography>
              ) : cell.notes.length > 0 ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gridTemplateRows: 'repeat(3, 1fr)',
                    width: '100%',
                    height: '100%',
                    p: 0.3,
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((noteNum) => (
                    <Typography
                      key={noteNum}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.75rem' },
                        fontWeight: 700,
                        textAlign: 'center',
                        color: isSelected ? 'secondary.contrastText' : 'text.secondary',
                        visibility: cell.notes.includes(noteNum) ? 'visible' : 'hidden',
                      }}
                    >
                      {noteNum}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </Box>
          );
        }),
      )}
    </Box>
  );
};
