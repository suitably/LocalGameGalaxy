import React from 'react';
import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import PoolRoundedIcon from '@mui/icons-material/PoolRounded';
import DangerousRoundedIcon from '@mui/icons-material/DangerousRounded';
import FlashOnRoundedIcon from '@mui/icons-material/FlashOnRounded';
import HeartBrokenRoundedIcon from '@mui/icons-material/HeartBrokenRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { useTranslation } from 'react-i18next';
import type { CardPlayer } from '../logic/types';
import { CardPlayerScoreRow, type CardPlayerRowTone } from './common/CardPlayerScoreRow';

interface SchwimmenPlayerCardProps {
  player: CardPlayer;
  isMarkedLoser: boolean;
  /** Round actions are hidden once a winner is determined. */
  actionsEnabled: boolean;
  onToggleLoser: () => void;
  onBlitz: () => void;
  onAdjustLife: (delta: number) => void;
}

const toneFor = (player: CardPlayer, isMarkedLoser: boolean): CardPlayerRowTone => {
  if (player.isEliminated) return 'eliminated';
  if (isMarkedLoser) return 'loser';
  return player.isSwimming ? 'swimming' : 'default';
};

/** One player's lives / status plus the per-round actions (lose a life, Blitz, manual +/-). */
export const SchwimmenPlayerCard: React.FC<SchwimmenPlayerCardProps> = ({
  player,
  isMarkedLoser,
  actionsEnabled,
  onToggleLoser,
  onBlitz,
  onAdjustLife,
}) => {
  const { t } = useTranslation();
  const { piece } = useTheme().palette;
  const chipSx = { fontSize: '0.75rem', fontWeight: 700 };

  const status = player.isEliminated ? (
    <Chip
      icon={<DangerousRoundedIcon fontSize="small" />}
      label={t('games.cards.eliminated', 'Ertrunken')}
      size="small"
      color="error"
      variant="outlined"
      sx={chipSx}
    />
  ) : player.isSwimming ? (
    <Chip
      icon={<PoolRoundedIcon fontSize="small" />}
      label={t('games.cards.swimming_status', 'Schwimmt (0 Leben)')}
      size="small"
      sx={{
        ...chipSx,
        bgcolor: alpha(piece.teal, 0.3),
        color: 'text.primary',
        border: `1px solid ${piece.teal}`,
      }}
    />
  ) : (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
      {Array.from({ length: player.lives }, (_, i) => (
        <FavoriteRoundedIcon key={i} sx={{ fontSize: 20, color: piece.red }} />
      ))}
    </Box>
  );

  return (
    <CardPlayerScoreRow tone={toneFor(player, isMarkedLoser)}>
      <Box sx={{ minWidth: 160 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {player.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>{status}</Box>
      </Box>

      {!player.isEliminated && actionsEnabled && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant={isMarkedLoser ? 'contained' : 'outlined'}
            color="error"
            size="small"
            startIcon={<HeartBrokenRoundedIcon />}
            onClick={onToggleLoser}
            sx={{ fontWeight: 700, px: 1.5 }}
          >
            {isMarkedLoser
              ? t('games.cards.schwimmen.marked_loser', 'Verliert Leben ✓')
              : t('games.cards.schwimmen.lose_life_btn', '-1 Leben')}
          </Button>

          <Tooltip
            title={t(
              'games.cards.schwimmen.blitz_tooltip',
              'Blitz! (31) - Alle anderen verlieren 1 Leben',
            )}
          >
            <Button
              variant="contained"
              size="small"
              startIcon={<FlashOnRoundedIcon />}
              onClick={onBlitz}
              sx={{
                bgcolor: piece.yellow,
                color: piece.contrastText,
                fontWeight: 800,
                px: 1.5,
                '&:hover': { bgcolor: piece.yellow, filter: 'brightness(0.92)' },
              }}
            >
              {t('games.cards.schwimmen.blitz_btn', 'Blitz!')}
            </Button>
          </Tooltip>

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
            <Tooltip title={t('games.cards.schwimmen.minus_life', 'Leben abziehen')}>
              <IconButton
                size="small"
                onClick={() => onAdjustLife(-1)}
                aria-label={t('games.cards.schwimmen.minus_life', 'Leben abziehen')}
              >
                <RemoveRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('games.cards.schwimmen.plus_life', 'Leben hinzufügen')}>
              <IconButton
                size="small"
                onClick={() => onAdjustLife(1)}
                aria-label={t('games.cards.schwimmen.plus_life', 'Leben hinzufügen')}
              >
                <AddRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </CardPlayerScoreRow>
  );
};
