import React, { useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHighRounded';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { parseSettingsLocation } from '../../settingsRoutes';
import { settingsCardSx } from '../../settingsStyles';
import { ServerSetupDialog } from '../../../../components/connection/setup/ServerSetupDialog';

/** The one entry to setting up a companion server: app, Docker compose, Cloudflare or terminal. */
export const ServerSetupCard: React.FC = () => {
  const { t } = useTranslation();
  const { pathname, search } = useLocation();
  // Deep links such as Melodiq's "set up server" (`highlight=setup`) open the wizard directly.
  const [open, setOpen] = useState(() => {
    const target = parseSettingsLocation(pathname, search);
    return target.kind === 'app' && target.highlight === 'setup';
  });
  return (
    <Paper id="settings-section-setup" tabIndex={-1} sx={settingsCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <AutoFixHighIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {t('settings.server_setup_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('settings.server_setup_desc')}
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        startIcon={<AutoFixHighIcon />}
        onClick={() => setOpen(true)}
        sx={{ borderRadius: 999, textTransform: 'none' }}
      >
        {t('server.setup_button')}
      </Button>
      <ServerSetupDialog open={open} onClose={() => setOpen(false)} />
    </Paper>
  );
};
