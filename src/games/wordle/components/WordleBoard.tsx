/**
 * WordleBoard.tsx - 6x5 Grid of Animated Letter Tiles
 */

import React from 'react';
import { Box } from '@mui/material';
import type { EvaluatedLetter, LetterStatus } from '../logic/types';

interface WordleBoardProps {
  guesses: string[];
  evaluations: EvaluatedLetter[][];
  currentInput: string;
  isShaking?: boolean;
}

const statusColors: Record<LetterStatus, { bg: string; border: string; text: string }> = {
  correct: { bg: '#2e7d32', border: '#2e7d32', text: '#ffffff' }, // Green
  present: { bg: '#f9a825', border: '#f9a825', text: '#ffffff' }, // Yellow
  absent: { bg: '#374151', border: '#374151', text: '#9ca3af' },  // Gray
  tbd: { bg: 'transparent', border: '#4b5563', text: '#ffffff' },
  empty: { bg: 'transparent', border: 'rgba(255, 255, 255, 0.12)', text: '#ffffff' },
};

export const WordleBoard: React.FC<WordleBoardProps> = ({
  guesses,
  evaluations,
  currentInput,
  isShaking = false,
}) => {
  const rows = Array.from({ length: 6 });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'center',
        justifyContent: 'center',
        my: 2,
      }}
    >
      {rows.map((_, rowIndex) => {
        const isPastRow = rowIndex < guesses.length;
        const isCurrentRow = rowIndex === guesses.length;

        let rowChars: { char: string; status: LetterStatus }[] = [];

        if (isPastRow) {
          const evalRow = evaluations[rowIndex] || [];
          rowChars = evalRow.map((e) => ({ char: e.char, status: e.status }));
        } else if (isCurrentRow) {
          rowChars = Array.from({ length: 5 }, (_, i) => ({
            char: currentInput[i] || '',
            status: currentInput[i] ? 'tbd' : 'empty',
          }));
        } else {
          rowChars = Array.from({ length: 5 }, () => ({ char: '', status: 'empty' }));
        }

        return (
          <Box
            key={rowIndex}
            sx={{
              display: 'flex',
              gap: 1,
              animation: isCurrentRow && isShaking ? 'shake 0.5s ease-in-out' : undefined,
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '20%, 60%': { transform: 'translateX(-6px)' },
                '40%, 80%': { transform: 'translateX(6px)' },
              },
            }}
          >
            {rowChars.map((tile, colIndex) => {
              const style = statusColors[tile.status];
              const isFilled = Boolean(tile.char);

              return (
                <Box
                  key={colIndex}
                  sx={{
                    width: { xs: 52, sm: 60, md: 64 },
                    height: { xs: 52, sm: 60, md: 64 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: { xs: '1.6rem', sm: '1.85rem', md: '2rem' },
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    userSelect: 'none',
                    borderRadius: 1.5,
                    border: `2px solid ${isFilled && tile.status === 'tbd' ? '#90caf9' : style.border}`,
                    bgcolor: style.bg,
                    color: style.text,
                    transform: isFilled && isCurrentRow ? 'scale(1.04)' : 'none',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: tile.status === 'correct' ? '0 0 12px rgba(46, 125, 50, 0.4)' : 'none',
                  }}
                >
                  {tile.char}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
};
