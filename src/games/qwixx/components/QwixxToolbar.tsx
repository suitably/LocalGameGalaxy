import React from 'react';
import { Box, Button, Chip, Tooltip } from '@mui/material';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import CasinoIcon from '@mui/icons-material/CasinoRounded';
import StyleIcon from '@mui/icons-material/StyleRounded';
import { useTranslation } from 'react-i18next';

interface QwixxToolbarProps {
  sheetName: string;
  showDice: boolean;
  onOpenSheetSelector: () => void;
  onPickRandomSheet: () => void;
  onToggleDice: () => void;
  onNewGame: () => void;
}

/** Sheet variant chips and dice / new-game buttons above the sheet. */
export const QwixxToolbar: React.FC<QwixxToolbarProps> = ({
  sheetName,
  showDice,
  onOpenSheetSelector,
  onPickRandomSheet,
  onToggleDice,
  onNewGame,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          icon={<StyleIcon />}
          label={sheetName}
          color="secondary"
          onClick={onOpenSheetSelector}
          size="small"
          clickable
          sx={{ fontWeight: 'bold' }}
        />
        <Tooltip title={t('games.qwixx.random_mode', 'Zufälliger Modus')}>
          <Chip
            icon={<CasinoIcon />}
            label={t('games.qwixx.random_mode', 'Zufall')}
            variant="outlined"
            color="secondary"
            onClick={onPickRandomSheet}
            size="small"
            clickable
            sx={{ fontWeight: 'bold' }}
          />
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant={showDice ? 'contained' : 'outlined'}
          size="small"
          color="secondary"
          startIcon={<CasinoIcon />}
          onClick={onToggleDice}
        >
          {showDice ? t('games.qwixx.hide_dice', 'Würfel') : t('games.qwixx.show_dice', 'Würfel')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<ReplayIcon />}
          onClick={onNewGame}
        >
          {t('games.qwixx.new_game', 'Neues Spiel')}
        </Button>
      </Box>
    </Box>
  );
};
