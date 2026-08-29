import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface LetterEntry {
  id: number;
  letter: string;
  used: boolean;
}

interface HintLetterChipsProps {
  letters: LetterEntry[];
  onLetterClick: (entry: LetterEntry) => void;
}

export const HintLetterChips: React.FC<HintLetterChipsProps> = ({
  letters,
  onLetterClick,
}) => {
  const { t } = useTranslation();

  if (!letters || letters.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        mt: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {t('guessart.hintLettersLabel', 'Buchstaben-Pool:')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center' }}>
        {letters.map((entry) => (
          <Chip
            key={`hint-letter-${entry.id}`}
            label={entry.letter}
            size="medium"
            color="primary"
            variant={entry.used ? 'outlined' : 'filled'}
            clickable={!entry.used}
            disabled={entry.used}
            onClick={() => !entry.used && onLetterClick(entry)}
            sx={{
              fontSize: '1.1rem',
              fontWeight: 700,
              height: 42,
              minWidth: 42,
              borderRadius: 2,
              opacity: entry.used ? 0.35 : 1,
              transition: 'all 0.15s ease-in-out',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
