import React from 'react';
import { Button } from '@mui/material';
import PrivacyTipRoundedIcon from '@mui/icons-material/PrivacyTipRounded';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../../components/settings';
import { privacyNoticePath } from '../privacyNotice';

/** About page: link to the privacy notice (public/privacy.html, public/datenschutz.html). */
export const PrivacyNoticeLink: React.FC = () => {
  const { t, i18n } = useTranslation();
  return (
    <SettingsSection
      id="privacy"
      title={t('settings.privacy_title')}
      description={t('settings.privacy_desc')}
      icon={<PrivacyTipRoundedIcon color="primary" />}
    >
      <Button
        variant="outlined"
        startIcon={<PrivacyTipRoundedIcon />}
        href={privacyNoticePath(i18n.resolvedLanguage ?? i18n.language)}
        target="_blank"
        rel="noopener"
      >
        {t('settings.privacy_open')}
      </Button>
    </SettingsSection>
  );
};
