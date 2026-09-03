import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useTranslation } from 'react-i18next';
import type { WordRouletteWordCheck } from '../types';

interface ModifierRouletteBarProps {
  evaluation: WordRouletteWordCheck[];
}

export const ModifierRouletteBar: React.FC<ModifierRouletteBarProps> = ({ evaluation }) => {
  const { t } = useTranslation();

  if (!evaluation || evaluation.length === 0) return null;

  const matchedCount = evaluation.filter((e) => e.matched).length;
  const isComplete = matchedCount === evaluation.length;

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: isComplete ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
        border: '1px solid',
        borderColor: isComplete ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CasinoRoundedIcon sx={{ color: isComplete ? '#4ade80' : '#facc15', fontSize: 20 }} />
          <Typography variant="caption" fontWeight={700} sx={{ color: '#f8fafc' }}>
            {t('storyteller.wordRouletteTitle', 'Word Roulette (Pflichtwörter)')}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: isComplete ? '#4ade80' : '#facc15' }}
        >
          {matchedCount}/{evaluation.length} {t('storyteller.wordsMatched', 'eingebaut')}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
        {evaluation.map(({ word, matched }) => (
          <Chip
            key={word}
            label={word}
            icon={
              matched ? (
                <CheckCircleRoundedIcon sx={{ fontSize: '1rem !important', color: '#fff !important' }} />
              ) : (
                <RadioButtonUncheckedRoundedIcon
                  sx={{ fontSize: '1rem !important', color: 'rgba(255, 255, 255, 0.6) !important' }}
                />
              )
            }
            sx={{
              fontWeight: 600,
              bgcolor: matched ? '#22c55e' : 'rgba(255, 255, 255, 0.08)',
              color: matched ? '#ffffff' : '#e2e8f0',
              border: matched ? 'none' : '1px dashed rgba(255, 255, 255, 0.25)',
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
