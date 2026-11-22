import React from 'react';
import { Chip, Stack } from '@mui/material';
import BrushRoundedIcon from '@mui/icons-material/BrushRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import CreateRoundedIcon from '@mui/icons-material/CreateRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import { useTranslation } from 'react-i18next';
import type { GarticGameState } from '../types';

interface GarticStatusChipsProps {
  playerName: string;
  phase: GarticGameState['phase'];
  roundIndex: number;
  totalRounds: number;
  revealBookIndex?: number;
  totalBooks?: number;
}

/** Compact status row at the top of the game body: who I am, round/album and phase (all sizes). */
export const GarticStatusChips: React.FC<GarticStatusChipsProps> = ({
  playerName,
  phase,
  roundIndex,
  totalRounds,
  revealBookIndex = 0,
  totalBooks = 0,
}) => {
  const { t } = useTranslation();

  const isPrompt = phase === 'prompt';
  const isDrawing = phase === 'drawing';
  const isGuessing = phase === 'guessing';
  const isReveal = phase === 'reveal';

  const phaseLabel = isPrompt
    ? t('gartic.phasePrompt')
    : isDrawing
      ? t('gartic.phaseDrawing')
      : isGuessing
        ? t('gartic.phaseGuessing')
        : t('gartic.phaseReveal');

  const PhaseIcon = isPrompt
    ? CreateRoundedIcon
    : isDrawing
      ? BrushRoundedIcon
      : isGuessing
        ? PsychologyRoundedIcon
        : CelebrationRoundedIcon;

  const chipSx = { fontWeight: 700, height: 24, fontSize: '0.75rem' };

  return (
    <Stack
      direction="row"
      gap={0.75}
      justifyContent="center"
      alignItems="center"
      flexWrap="wrap"
      sx={{ px: 1, py: 0.5, flexShrink: 0 }}
    >
      <Chip label={playerName || t('common.you')} color="secondary" size="small" sx={chipSx} />
      {isReveal ? (
        <Chip
          label={`${t('gartic.albumHeader')} ${revealBookIndex + 1}/${totalBooks}`}
          size="small"
          color="secondary"
          variant="outlined"
          sx={chipSx}
        />
      ) : (
        <Chip
          label={`${t('guessart.roundHeader', { round: roundIndex + 1 })} / ${totalRounds}`}
          size="small"
          variant="outlined"
          sx={chipSx}
        />
      )}
      <Chip
        icon={<PhaseIcon fontSize="small" />}
        label={phaseLabel}
        color={isDrawing ? 'primary' : isGuessing ? 'warning' : 'secondary'}
        size="small"
        sx={chipSx}
      />
    </Stack>
  );
};
