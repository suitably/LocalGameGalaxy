/**
 * WordleBoard.tsx - 6x5 Grid of Animated Letter Tiles
 */

import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { EvaluatedLetter, LetterStatus } from '../logic/types';
import { statusLabelKey, tileStyle } from './tileStyles';

interface WordleBoardProps {
  guesses: string[];
  evaluations: EvaluatedLetter[][];
  currentInput: string;
  isShaking?: boolean;
}

export const WordleBoard: React.FC<WordleBoardProps> = ({
  guesses,
  evaluations,
  currentInput,
  isShaking = false,
}) => {
  const { t } = useTranslation();
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
              const style = tileStyle(tile.status);
              const isFilled = Boolean(tile.char);

              return (
                <Box
                  key={colIndex}
                  role="img"
                  aria-label={`${tile.char || '-'}: ${t(statusLabelKey(tile.status))}`}
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
                    borderRadius: 2,
                    border: '2px solid',
                    ...style,
                    borderColor:
                      isFilled && tile.status === 'tbd' ? 'text.primary' : style.borderColor,
                    transform: isFilled && isCurrentRow ? 'scale(1.04)' : 'none',
                    transition: 'all 0.15s ease-in-out',
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
