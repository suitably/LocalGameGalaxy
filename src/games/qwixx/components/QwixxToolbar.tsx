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

/** Phones: the buttons show only their icon so chips and buttons fit on one line. */
const iconOnlyOnPhone = {
  minWidth: { xs: 48, sm: 64 },
  px: { xs: 1, sm: 1.5 },
  '& .MuiButton-startIcon': { mx: { xs: 0 }, ml: { sm: -0.5 }, mr: { sm: 1 } },
};
const phoneHidden = { display: { xs: 'none', sm: 'inline' } };

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
  const diceLabel = showDice
    ? t('games.qwixx.hide_dice', 'Würfel')
    : t('games.qwixx.show_dice', 'Würfel');
  const newGameLabel = t('games.qwixx.new_game', 'Neues Spiel');

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: { xs: 1, sm: 2 },
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
          aria-label={diceLabel}
          sx={iconOnlyOnPhone}
        >
          <Box component="span" sx={phoneHidden}>
            {diceLabel}
          </Box>
        </Button>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<ReplayIcon />}
          onClick={onNewGame}
          aria-label={newGameLabel}
          sx={iconOnlyOnPhone}
        >
          <Box component="span" sx={phoneHidden}>
            {newGameLabel}
          </Box>
        </Button>
      </Box>
    </Box>
  );
};
