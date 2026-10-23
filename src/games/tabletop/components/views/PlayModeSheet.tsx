/**
 * How to play a table game: one shared device or everyone on their own [ID: GAME-TABLETOP-PLAY-MODE-SHEET]
 *
 * Bottom sheet with two large targets (thumb reach on phones). Only shown when a game supports
 * both modes; otherwise the game opens directly.
 */
import React from 'react';
import { Box, Button, Drawer, Typography } from '@mui/material';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import { useTranslation } from 'react-i18next';
import type { PlayMode } from '../../logic/tableCatalog';

export const PlayModeSheet: React.FC<{
  gameTitle: string | null;
  onClose: () => void;
  onChoose: (mode: PlayMode) => void;
}> = ({ gameTitle, onClose, onChoose }) => {
  const { t } = useTranslation();
  const option = (mode: PlayMode, icon: React.ReactNode, title: string, hint: string) => (
    <Button
      variant={mode === 'shared_device' ? 'contained' : 'outlined'}
      onClick={() => onChoose(mode)}
      startIcon={icon}
      sx={{
        justifyContent: 'flex-start',
        textAlign: 'left',
        py: 1.5,
        px: 2,
        borderRadius: 3,
        minHeight: 64,
      }}
    >
      <Box>
        <Typography fontWeight={800} sx={{ textTransform: 'none' }}>
          {title}
        </Typography>
        <Typography
          variant="caption"
          sx={{ textTransform: 'none', opacity: 0.85, display: 'block' }}
        >
          {hint}
        </Typography>
      </Box>
    </Button>
  );

  return (
    <Drawer
      anchor="bottom"
      open={Boolean(gameTitle)}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          p: 2,
          pb: 'max(16px, env(safe-area-inset-bottom))',
          maxWidth: 560,
          mx: 'auto',
        },
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
        {gameTitle}
      </Typography>
      <Box display="flex" flexDirection="column" gap={1.5}>
        {option(
          'shared_device',
          <SwapHorizRoundedIcon />,
          t('games.tabletop.mode_shared_device', 'Ein Gerät für alle'),
          t(
            'games.tabletop.mode_shared_device_hint',
            'Reihum weitergeben – Handkarten bleiben beim Wechsel verdeckt.',
          ),
        )}
        {option(
          'own_devices',
          <QrCode2RoundedIcon />,
          t('games.tabletop.mode_own_devices', 'Jeder am eigenen Gerät'),
          t(
            'games.tabletop.mode_own_devices_hint',
            'Session öffnen, Mitspieler treten per QR-Code oder Link bei.',
          ),
        )}
      </Box>
    </Drawer>
  );
};
