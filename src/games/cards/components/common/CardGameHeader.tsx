import React from 'react';
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { useTranslation } from 'react-i18next';

interface CardGameHeaderProps {
  /** Round indicator, e.g. "Runde 3". The game name lives in GlobalHeader only. */
  roundLabel: string;
  onExit: () => void;
  onRestart: () => void;
  onHistory?: () => void;
  onUndo?: () => void;
}

/** Back button, round indicator and undo / history / restart actions shared by all card trackers. */
export const CardGameHeader: React.FC<CardGameHeaderProps> = ({
  roundLabel,
  onExit,
  onRestart,
  onHistory,
  onUndo,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={onExit}
        size="small"
        sx={{ color: 'text.secondary' }}
      >
        {t('common.back', 'Zurück')}
      </Button>

      <Typography variant="h6" component="h2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {roundLabel}
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {onUndo && (
          <Tooltip title={t('games.cards.undo', 'Rückgängig')}>
            <IconButton
              size="small"
              onClick={onUndo}
              aria-label={t('games.cards.undo', 'Rückgängig')}
            >
              <UndoRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onHistory && (
          <Tooltip title={t('games.cards.round_history', 'Rundenhistorie')}>
            <IconButton
              size="small"
              onClick={onHistory}
              aria-label={t('games.cards.round_history', 'Rundenhistorie')}
            >
              <HistoryRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('common.restart', 'Neu starten')}>
          <IconButton
            size="small"
            onClick={onRestart}
            aria-label={t('common.restart', 'Neu starten')}
          >
            <ReplayRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
