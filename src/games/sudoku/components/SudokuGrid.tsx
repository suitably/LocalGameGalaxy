/**
 * SudokuGrid.tsx - 9x9 Interactive Grid with 3x3 Block Borders and Smart Highlighting
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
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
        bgcolor: '#374151',
        border: '3px solid #60a5fa',
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
            bgcolor: 'rgba(18, 18, 18, 0.95)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#90caf9' }}>
            PAUSE ⏸️
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
          const borderRight = cIdx % 3 === 2 && cIdx !== 8 ? '2px solid #60a5fa' : undefined;
          const borderBottom = rIdx % 3 === 2 && rIdx !== 8 ? '2px solid #60a5fa' : undefined;

          let cellBg = '#1e293b';
          if (cell.isError) {
            cellBg = 'rgba(239, 68, 68, 0.35)';
          } else if (isSelected) {
            cellBg = '#2563eb';
          } else if (isSameNumber) {
            cellBg = 'rgba(96, 165, 250, 0.35)';
          } else if (isRelated) {
            cellBg = 'rgba(51, 65, 85, 0.7)';
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
                      ? '#ef4444'
                      : isSelected
                      ? '#ffffff'
                      : cell.isInitial
                      ? '#ffffff'
                      : '#60a5fa',
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
                        fontSize: { xs: '0.55rem', sm: '0.65rem' },
                        fontWeight: 700,
                        textAlign: 'center',
                        color: isSelected ? '#ffffff' : '#94a3b8',
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
        })
      )}
    </Box>
  );
};
