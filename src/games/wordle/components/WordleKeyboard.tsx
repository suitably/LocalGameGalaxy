/**
 * WordleKeyboard.tsx - On-screen and Physical Keyboard Handler
 */

import React, { useEffect } from 'react';
import { Box, Button } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceRounded';
import { useTranslation } from 'react-i18next';
import type { LetterStatus } from '../logic/types';
import { statusLabelKey, tileStyle } from './tileStyles';

interface WordleKeyboardProps {
  onChar: (char: string) => void;
  onDelete: () => void;
  onEnter: () => void;
  keyStatuses: Record<string, LetterStatus>;
  language?: string;
  disabled?: boolean;
}

export const WordleKeyboard: React.FC<WordleKeyboardProps> = ({
  onChar,
  onDelete,
  onEnter,
  keyStatuses,
  language = 'de',
  disabled = false,
}) => {
  const { t } = useTranslation();
  const isGerman = language.startsWith('de');

  const rows = [
    isGerman
      ? ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P']
      : ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', isGerman ? 'Y' : 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DELETE'],
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
            const status: LetterStatus = isSpecial ? 'empty' : keyStatuses[key] || 'empty';
            const style = tileStyle(status === 'empty' ? 'tbd' : status);

            return (
              <Button
                key={key}
                disabled={disabled}
                aria-label={
                  isSpecial
                    ? key === 'ENTER'
                      ? t('wordle.key_enter', 'Enter')
                      : t('wordle.key_delete', 'Delete')
                    : `${key}: ${t(statusLabelKey(status))}`
                }
                onClick={() => {
                  if (key === 'ENTER') onEnter();
                  else if (key === 'DELETE') onDelete();
                  else onChar(key);
                }}
                sx={{
                  minWidth: isSpecial ? { xs: 54, sm: 66 } : { xs: 30, sm: 38 },
                  height: { xs: 50, sm: 54 },
                  p: 0,
                  fontSize: isSpecial
                    ? { xs: '0.75rem', sm: '0.85rem' }
                    : { xs: '1.15rem', sm: '1.25rem' },
                  fontWeight: 700,
                  ...(isSpecial
                    ? { bgcolor: 'action.selected', color: 'text.primary' }
                    : {
                        ...style,
                        bgcolor: status === 'empty' ? 'background.paper' : style.bgcolor,
                        border: '2px solid',
                        borderColor: status === 'empty' ? 'divider' : style.borderColor,
                        borderStyle: style.borderStyle ?? 'solid',
                      }),
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: isSpecial || status === 'empty' ? 'action.hover' : style.bgcolor,
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
