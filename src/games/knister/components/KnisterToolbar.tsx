import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import UndoIcon from '@mui/icons-material/UndoRounded';
import { useTranslation } from 'react-i18next';
import { LocalPlayersButton } from '../../../modules/pass-and-play';

interface KnisterToolbarProps {
  showDice: boolean;
  canUndo: boolean;
  onToggleDice: () => void;
  onUndo: () => void;
  onOpenLegend: () => void;
  onReset: () => void;
  onPlayers: () => void;
}

export const KnisterToolbar: React.FC<KnisterToolbarProps> = ({
  showDice,
  canUndo,
  onToggleDice,
  onUndo,
  onOpenLegend,
  onReset,
  onPlayers,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        mb: { xs: 1, sm: 1.5 },
        flexWrap: 'wrap',
      }}
    >
      <LocalPlayersButton onClick={onPlayers} />
      <Tooltip title={t('games.knister.show_dice_tooltip')}>
        <Button
          variant={showDice ? 'contained' : 'outlined'}
          size="small"
          color="secondary"
          startIcon={<CasinoIcon />}
          aria-pressed={showDice}
          onClick={onToggleDice}
          sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', minHeight: 44 }}
        >
          {showDice ? t('games.knister.hide_dice') : t('games.knister.show_dice')}
        </Button>
      </Tooltip>

      <Tooltip title={t('games.knister.undo_tooltip')} describeChild>
        <span>
          <IconButton
            aria-label={t('games.knister.undo_tooltip')}
            onClick={onUndo}
            disabled={!canUndo}
            color="inherit"
            sx={{
              width: 44,
              height: 44,
              border: 1,
              borderColor: 'divider',
              '&.Mui-disabled': { opacity: 0.35 },
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={t('games.knister.show_legend')}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HelpOutlineIcon />}
          onClick={onOpenLegend}
          aria-label={t('games.knister.show_legend')}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
            borderColor: 'divider',
            minWidth: 44,
            minHeight: 44,
            // Phones: icon only, so the toolbar stays on one row.
            '& .MuiButton-startIcon': { mx: { xs: 0, sm: undefined } },
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {t('games.knister.show_legend')}
          </Box>
        </Button>
      </Tooltip>

      <Tooltip title={t('games.knister.new_game')}>
        <IconButton
          onClick={onReset}
          color="inherit"
          aria-label={t('games.knister.new_game')}
          sx={{ width: 44, height: 44 }}
        >
          <ReplayIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
