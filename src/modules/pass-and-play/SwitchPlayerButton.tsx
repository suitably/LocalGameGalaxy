/**
 * "Switch player" button for pass and play, sized for thumbs [ID: MOD-PASS-AND-PLAY-BUTTON]
 */
import React from 'react';
import { Fab } from '@mui/material';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { useTranslation } from 'react-i18next';
import type { SxProps, Theme } from '@mui/material';

export const SwitchPlayerButton: React.FC<{
  onClick: () => void;
  /** Name of the player whose turn it is now, shown on the button. */
  currentName?: string;
  sx?: SxProps<Theme>;
}> = ({ onClick, currentName, sx }) => {
  const { t } = useTranslation();
  return (
    <Fab
      variant="extended"
      color="primary"
      onClick={onClick}
      aria-label={t('common.passAndPlay.switch', 'Spieler wechseln')}
      sx={{ minHeight: 48, fontWeight: 800, textTransform: 'none', ...sx }}
    >
      <SwapHorizRoundedIcon sx={{ mr: 1 }} />
      {currentName
        ? t('common.passAndPlay.switchFrom', '{{name}} fertig', { name: currentName })
        : t('common.passAndPlay.switch', 'Spieler wechseln')}
    </Fab>
  );
};
