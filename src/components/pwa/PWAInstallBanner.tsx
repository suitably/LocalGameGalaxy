import React, { useState } from 'react';
import { Paper, Box, Typography, Button, IconButton, alpha } from '@mui/material';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallDialog } from './PWAInstallDialog';

export const PWAInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return sessionStorage.getItem('pwa-banner-dismissed') === 'true';
  });

  if (isStandalone || !isInstallable || dismissed) {
    return (
      <>
        <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
      </>
    );
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  return (
    <>
      <Paper
        elevation={4}
        sx={{
          mb: 4,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 3,
          background: (theme) =>
            `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(
              theme.palette.secondary.main,
              0.15
            )} 100%)`,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pr: { xs: 4, sm: 0 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1.25,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <InstallMobileIcon sx={{ fontSize: { xs: 28, sm: 32 } }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {t('app.install_pwa', 'Install App')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t(
                'app.install_pwa_hub_banner',
                'Install the app on your smartphone for a native, full-screen gaming experience without the browser search bar!'
              )}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: { xs: 'flex-end', sm: 'center' } }}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={installApp}
            startIcon={<InstallMobileIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              px: 2.5,
            }}
          >
            {t('app.install_pwa_short', 'Install')}
          </Button>

          <IconButton
            size="small"
            onClick={handleDismiss}
            aria-label="close banner"
            sx={{
              position: { xs: 'absolute', sm: 'static' },
              top: { xs: 8, sm: 'auto' },
              right: { xs: 8, sm: 'auto' },
              color: 'text.secondary',
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Paper>

      <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    </>
  );
};
