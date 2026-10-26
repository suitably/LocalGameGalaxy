import React, { useState, useEffect, useCallback } from 'react';
import { alpha, Box, Typography, Button, Alert, IconButton, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import SettingsIcon from '@mui/icons-material/SettingsRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hasGitHubPAT } from '../../lib/github';
import { hasFeedbackRelay } from '../../lib/feedbackRelay';
import { FeedbackForm } from './FeedbackForm';
import { settingsPath } from '../../features/settings/settingsRoutes';

export const FeedbackDialog: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hasGithubConfig, setHasGithubConfig] = useState(true);

  const checkConfig = useCallback(() => {
    setHasGithubConfig(hasGitHubPAT() || hasFeedbackRelay());
  }, []);

  // Expose open method via custom event so GlobalHeader can trigger it
  useEffect(() => {
    const handleOpen = () => {
      if (!hasGitHubPAT() && !hasFeedbackRelay()) {
        navigate(settingsPath({ kind: 'app', section: 'integrations', highlight: 'pat' }));
        return;
      }
      checkConfig();
      setOpen(true);
    };
    window.addEventListener('feedback:open', handleOpen);
    return () => window.removeEventListener('feedback:open', handleOpen);
  }, [checkConfig, navigate]);

  const handleClose = () => {
    setOpen(false);
  };

  if (!open || !(hasGitHubPAT() || hasFeedbackRelay())) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          p: 3,
        },
      }}
    >
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('settings.feedback_title', 'Feedback & Bug Report')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {t(
                'settings.feedback_desc',
                'Creates a GitHub issue via your configured connection.',
              )}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {!hasGithubConfig && (
          <Alert
            severity="warning"
            icon={<VpnKeyRoundedIcon fontSize="inherit" />}
            sx={{
              mb: 2.5,
              bgcolor: (theme) => alpha(theme.palette.warning.main, 0.15),
              color: 'text.primary',
              border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
              '& .MuiAlert-icon': { color: 'warning.main' },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {t('settings.github_missing_title', 'GitHub-Verbindung erforderlich')}
            </Typography>
            <Typography
              variant="caption"
              sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}
            >
              {t(
                'settings.github_missing_desc',
                'Um Feedback oder Fehlermeldungen direkt als Issue zu senden, hinterlege bitte zuerst ein Personal Access Token (PAT) in den Einstellungen.',
              )}
            </Typography>
            <Button
              variant="contained"
              color="warning"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => {
                handleClose();
                navigate(settingsPath({ kind: 'app', section: 'integrations', highlight: 'pat' }));
              }}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('settings.open_settings', 'Zu den Einstellungen')}
            </Button>
          </Alert>
        )}

        <FeedbackForm onClose={handleClose} showCloseButton disabled={!hasGithubConfig} />
      </Box>
    </Dialog>
  );
};
