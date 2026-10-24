import React from 'react';
import { alpha, Box, Chip, Stack, Typography } from '@mui/material';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import { useTranslation } from 'react-i18next';
import type { WordRouletteWordCheck } from '../types';
import { transitionOf } from '../../../lib/motion';

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
        bgcolor: (theme) => alpha(theme.palette[isComplete ? 'success' : 'primary'].main, 0.1),
        border: '1px solid',
        borderColor: (theme) => alpha(theme.palette[isComplete ? 'success' : 'primary'].main, 0.3),
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
          <CasinoRoundedIcon
            sx={{ color: isComplete ? 'success.main' : 'primary.main', fontSize: 20 }}
          />
          <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
            {t('storyteller.wordRouletteTitle', 'Word Roulette (Pflichtwörter)')}
          </Typography>
        </Stack>

        <Typography
          variant="caption"
          fontWeight={600}
          sx={{ color: isComplete ? 'success.main' : 'primary.main' }}
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
                <CheckCircleRoundedIcon
                  sx={{
                    fontSize: '1rem !important',
                    color: (theme) => `${theme.palette.text.primary} !important`,
                  }}
                />
              ) : (
                <RadioButtonUncheckedRoundedIcon
                  sx={{
                    fontSize: '1rem !important',
                    color: (theme) => `${alpha(theme.palette.text.primary, 0.6)} !important`,
                  }}
                />
              )
            }
            sx={{
              fontWeight: 600,
              bgcolor: matched ? 'success.main' : 'action.selected',
              color: matched ? 'success.contrastText' : 'text.primary',
              border: matched ? 'none' : '1px dashed',
              borderColor: 'text.disabled',
              transition: transitionOf(['background-color', 'color', 'border-color']),
            }}
          />
        ))}
      </Stack>
    </Box>
  );
};
