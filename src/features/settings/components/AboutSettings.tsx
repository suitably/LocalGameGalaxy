import React, { useState } from 'react';
import { Button } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/FeedbackRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SettingsSection } from '../../../components/settings';
import { resolveGitHubConfig } from '../../../lib/github';
import { settingsPath } from '../settingsRoutes';

/** About page: feedback & bug report entry (needs a GitHub token, else leads to Integrations). */
export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hasConfig] = useState(() => resolveGitHubConfig().source !== 'none');

  return (
    <SettingsSection
      id="feedback"
      title={t('settings.feedback_title', 'Feedback & Bug Report')}
      description={t(
        'settings.feedback_desc',
        'Fehler gefunden oder einen Verbesserungsvorschlag? Reiche hier direkt Feedback ein oder erstelle ein Issue auf GitHub.',
      )}
      icon={<FeedbackIcon color="primary" />}
    >
      {hasConfig ? (
        <Button
          variant="outlined"
          startIcon={<FeedbackIcon />}
          onClick={() => window.dispatchEvent(new Event('feedback:open'))}
        >
          {t('settings.submit', 'Submit Feedback')}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="warning"
          startIcon={<VpnKeyRoundedIcon />}
          onClick={() =>
            navigate(settingsPath({ kind: 'app', section: 'integrations', highlight: 'pat' }))
          }
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t('settings.pat_focus_button', 'PAT-Token hinterlegen')}
        </Button>
      )}
    </SettingsSection>
  );
};
