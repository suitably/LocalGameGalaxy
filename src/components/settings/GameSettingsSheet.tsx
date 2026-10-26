import React from 'react';
import {
  Box,
  Button,
  Dialog,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GameSettingsSectionDefinition } from '../../lib/gameSettingsTypes';
import { GameSettingsSections } from './GameSettingsSections';
import type { GameSettingsViewer } from '../../lib/gameSettingsTypes';

export interface GameSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  /** Translation key of the game title. */
  titleKey: string;
  sections: readonly GameSettingsSectionDefinition[];
  audience?: GameSettingsViewer;
}

/** In-game settings: full-screen dialog on phones, right drawer from `md`. Closes on Android back (Modal). */
export const GameSettingsSheet: React.FC<GameSettingsSheetProps> = ({
  open,
  onClose,
  titleKey,
  sections,
  audience = 'host',
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const openAppSettings = () => {
    const from = location.pathname + location.search;
    onClose();
    navigate('/settings', { state: { from } });
  };

  const body = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, fontWeight: 700 }}>
          {t('settings.game_sheet_title', { game: t(titleKey) })}
        </Typography>
        <IconButton aria-label={t('common.close', 'Close')} onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <GameSettingsSections sections={sections} audience={audience} />
      </Box>
      <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1.5 }}>
        <Button onClick={openAppSettings} fullWidth>
          {t('settings.app_settings_link', 'App settings')}
        </Button>
      </Box>
    </Box>
  );

  if (isDesktop) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: 420, maxWidth: '100vw' } }}
      >
        {body}
      </Drawer>
    );
  }
  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      {body}
    </Dialog>
  );
};
