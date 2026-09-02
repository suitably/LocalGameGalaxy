/**
 * WordleKeyboard.tsx - On-screen and Physical Keyboard Handler
 */

import React, { useEffect } from 'react';
import { Box, Button } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import type { LetterStatus } from '../logic/types';

interface WordleKeyboardProps {
  onChar: (char: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  keyStatuses: Record<string, LetterStatus>;
  language?: string;
  disabled?: boolean;
}

const keyBgColors: Record<LetterStatus, { bg: string; text: string }> = {
  correct: { bg: '#2e7d32', text: '#ffffff' },
  present: { bg: '#f9a825', text: '#ffffff' },
  absent: { bg: '#374151', text: '#9ca3af' },
  tbd: { bg: 'rgba(255, 255, 255, 0.08)', text: '#ffffff' },
  empty: { bg: 'rgba(255, 255, 255, 0.08)', text: '#ffffff' },
};

export const WordleKeyboard: React.FC<WordleKeyboardProps> = ({
  onChar,
  onDelete,
  onEnter,
  keyStatuses,
  language = 'de',
  disabled = false,
}) => {
  const isGerman = language.startsWith('de');

  const rows = [
    isGerman
      ? ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P']
      : ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    [
      'ENTER',
      isGerman ? 'Y' : 'Z',
      'X',
      'C',
      'V',
      'B',
      'N',
      'M',
      'DELETE',
    ],
  ];

  // Physical keyboard listener
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        onEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      } else {
        const key = e.key.toUpperCase();
        if (/^[A-Z]$/.test(key)) {
          e.preventDefault();
          onChar(key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChar, onDelete, onEnter, disabled]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.8,
        width: '100%',
        maxWidth: 500,
        mx: 'auto',
        mt: 2,
        mb: 3,
        userSelect: 'none',
      }}
    >
      {rows.map((row, rowIndex) => (
        <Box
          key={rowIndex}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: { xs: 0.5, sm: 0.8 },
          }}
        >
          {row.map((key) => {
            const isSpecial = key === 'ENTER' || key === 'DELETE';
            const status = isSpecial ? 'empty' : keyStatuses[key] || 'empty';
            const style = keyBgColors[status];

            return (
              <Button
                key={key}
                disabled={disabled}
                onClick={() => {
                  if (key === 'ENTER') onEnter();
                  else if (key === 'DELETE') onDelete();
                  else onChar(key);
                }}
                sx={{
                  minWidth: isSpecial ? { xs: 54, sm: 66 } : { xs: 30, sm: 38 },
                  height: { xs: 50, sm: 54 },
                  p: 0,
                  fontSize: isSpecial ? { xs: '0.75rem', sm: '0.85rem' } : { xs: '1.15rem', sm: '1.25rem' },
                  fontWeight: 700,
                  bgcolor: isSpecial ? 'rgba(255, 255, 255, 0.12)' : style.bg,
                  color: isSpecial ? '#ffffff' : style.text,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: isSpecial ? 'rgba(255, 255, 255, 0.2)' : style.bg,
                    filter: 'brightness(1.15)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {key === 'DELETE' ? <BackspaceOutlinedIcon fontSize="small" /> : key}
              </Button>
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
