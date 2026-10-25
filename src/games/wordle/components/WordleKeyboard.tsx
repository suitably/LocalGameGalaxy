/**
 * WordleKeyboard.tsx - On-screen and Physical Keyboard Handler
 */

import React, { useEffect } from 'react';
import { Box, ButtonBase } from '@mui/material';
import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceRounded';
import { useTranslation } from 'react-i18next';
import type { LetterStatus } from '../logic/types';
import { statusLabelKey, tileStyle } from './tileStyles';

/** Row height incl. the 2px face margins; keeps every key >= 48px tall in portrait and landscape. */
const KEY_HEIGHT = 56;

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
        gap: 0,
        width: '100%',
        maxWidth: 500,
        mx: 'auto',
        mt: 2,
        mb: 3,
        userSelect: 'none',
      }}
    >
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', justifyContent: 'center' }}>
          {/* Half-key spacers centre the 9-key row without a gap between keys. */}
          {rowIndex === 1 && <Box sx={{ flex: 0.5 }} />}
          {row.map((key) => {
            const isSpecial = key === 'ENTER' || key === 'DELETE';
            const status: LetterStatus = isSpecial ? 'empty' : keyStatuses[key] || 'empty';
            const style = tileStyle(status === 'empty' ? 'tbd' : status);
            const faceBg = isSpecial
              ? 'action.selected'
              : status === 'empty'
                ? 'background.paper'
                : style.bgcolor;

            return (
              <ButtonBase
                key={key}
                disabled={disabled}
                // 10 keys cannot be 48px wide at 360px: keys fill the row with zero gap, the
                // visual gap is the face margin, so the hit area has no dead zones.
                data-touch-exempt="dense-keyboard-width"
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
                  flex: isSpecial ? 1.5 : 1,
                  minWidth: 0,
                  height: KEY_HEIGHT,
                  p: 0,
                  '&:active .key-face': { transform: 'scale(0.95)' },
                  '&:hover .key-face': {
                    bgcolor: isSpecial || status === 'empty' ? 'action.hover' : style.bgcolor,
                  },
                }}
              >
                <Box
                  className="key-face"
                  sx={{
                    width: '100%',
                    height: 'calc(100% - 4px)',
                    m: '2px',
                    mx: { xs: '1.5px', sm: '2.5px' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isSpecial
                      ? { xs: '0.75rem', sm: '0.85rem' }
                      : { xs: '1.15rem', sm: '1.25rem' },
                    fontWeight: 700,
                    borderRadius: 2,
                    transition: 'transform 0.1s',
                    ...(isSpecial
                      ? { color: 'text.primary' }
                      : {
                          ...style,
                          border: '2px solid',
                          borderColor: status === 'empty' ? 'divider' : style.borderColor,
                          borderStyle: style.borderStyle ?? 'solid',
                        }),
                    bgcolor: faceBg,
                  }}
                >
                  {key === 'DELETE' ? <BackspaceOutlinedIcon fontSize="small" /> : key}
                </Box>
              </ButtonBase>
            );
          })}
          {rowIndex === 1 && <Box sx={{ flex: 0.5 }} />}
        </Box>
      ))}
    </Box>
  );
};
