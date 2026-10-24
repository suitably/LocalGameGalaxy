import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import UndoIcon from '@mui/icons-material/UndoRounded';
import { useTranslation } from 'react-i18next';

interface KnisterToolbarProps {
  showDice: boolean;
  canUndo: boolean;
  onToggleDice: () => void;
  onUndo: () => void;
  onOpenLegend: () => void;
  onReset: () => void;
}

export const KnisterToolbar: React.FC<KnisterToolbarProps> = ({
  showDice,
  canUndo,
  onToggleDice,
  onUndo,
  onOpenLegend,
  onReset,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        mb: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Tooltip title={t('games.knister.show_dice_tooltip', 'Virtuelle Würfel ein-/ausblenden')}>
        <Button
          variant={showDice ? 'contained' : 'outlined'}
          size="small"
          color="secondary"
          startIcon={<CasinoIcon />}
          onClick={onToggleDice}
          sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none' }}
        >
          {showDice
            ? t('games.knister.hide_dice', 'Würfel')
            : t('games.knister.show_dice', 'Würfel')}
        </Button>
      </Tooltip>

      <Tooltip title={t('games.knister.undo_tooltip', 'Letzten Eintrag rückgängig machen')}>
        <span>
          <IconButton
            onClick={onUndo}
            disabled={!canUndo}
            color="inherit"
            size="small"
            sx={{ border: 1, borderColor: 'divider', '&.Mui-disabled': { opacity: 0.35 } }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={t('games.knister.show_legend', 'Punkteübersicht')}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HelpOutlineIcon />}
          onClick={onOpenLegend}
          sx={{ borderRadius: 3, textTransform: 'none', borderColor: 'divider' }}
        >
          {t('games.knister.legend_title', 'Regeln')}
        </Button>
      </Tooltip>

      <Tooltip title={t('games.knister.new_game', 'Neues Spiel')}>
        <IconButton onClick={onReset} color="inherit" size="small">
          <ReplayIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
