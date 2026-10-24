import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import UndoIcon from '@mui/icons-material/UndoRounded';
import RestoreIcon from '@mui/icons-material/RestoreRounded';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../settingsStyles';

/** Notice shown when the legacy `sub=server` link is opened; points to the Server tab. */
export const MelodiqServerMovedNotice: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Paper
      sx={{
        ...settingsCardSx,
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('melodiq.server.moved_title', 'Server- & KI-Einstellungen wurden verschoben')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'melodiq.server.moved_desc',
            'Der MelodiQ Companion Server befindet sich jetzt zentral im neuen Server-Tab.',
          )}
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          const params = new URLSearchParams(window.location.search);
          params.set('tab', 'server');
          params.delete('sub');
          window.location.search = params.toString();
        }}
      >
        {t('settings.server_tab', 'Zum Server-Tab')}
      </Button>
    </Paper>
  );
};

const actionSx = { width: { xs: '100%', sm: 'auto' }, borderRadius: 50, px: 4, py: 1.5 } as const;

interface MelodiqGameplayActionsProps {
  onUndo: () => void;
  onResetDefaults: () => void;
  onBackToGame?: () => void;
}

/** Undo-session / reset-defaults / back buttons below the gameplay settings. */
export const MelodiqGameplayActions: React.FC<MelodiqGameplayActionsProps> = ({
  onUndo,
  onResetDefaults,
  onBackToGame,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        mt: 2,
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Button variant="outlined" startIcon={<UndoIcon />} onClick={onUndo} sx={actionSx}>
        {t('melodiq.settings.undo_session', 'Undo session changes')}
      </Button>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<RestoreIcon />}
        onClick={onResetDefaults}
        sx={actionSx}
      >
        {t('melodiq.settings.reset_defaults', 'Reset defaults')}
      </Button>
      {onBackToGame && (
        <Button variant="contained" onClick={onBackToGame} sx={{ ...actionSx, ml: { sm: 'auto' } }}>
          {t('common.back', 'Zurück')}
        </Button>
      )}
    </Box>
  );
};
