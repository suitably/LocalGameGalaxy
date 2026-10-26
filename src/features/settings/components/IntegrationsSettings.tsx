import React, { useCallback, useState } from 'react';
import { alpha, Alert, Box, Typography } from '@mui/material';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import { useTranslation } from 'react-i18next';
import { GitHubSettings } from './GitHubSettings';
import { resolveGitHubConfig } from '../../../lib/github';

/** Integrations page: GitHub token plus the "connection required" alert. */
export const IntegrationsSettings: React.FC<{ highlightPat?: boolean }> = ({ highlightPat }) => {
  const { t } = useTranslation();
  const [hasConfig, setHasConfig] = useState(() => resolveGitHubConfig().source !== 'none');
  const refresh = useCallback(() => setHasConfig(resolveGitHubConfig().source !== 'none'), []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {(!hasConfig || highlightPat) && (
        <Alert
          severity="warning"
          icon={<VpnKeyRoundedIcon fontSize="inherit" />}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.15),
            color: 'text.primary',
            border: (theme) => `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
            '& .MuiAlert-icon': { color: 'warning.main' },
            borderRadius: 3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {t('settings.github_missing_title', 'GitHub-Verbindung erforderlich')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t(
              'settings.pat_hint_feedback',
              'Bitte hinterlege zuerst ein GitHub Personal Access Token (PAT) unten, um Feedback oder Bug-Reports als Issue zu erstellen.',
            )}
          </Typography>
        </Alert>
      )}
      <GitHubSettings autoFocusPat={highlightPat || !hasConfig} onConfigChange={refresh} />
    </Box>
  );
};
