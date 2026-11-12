import React from 'react';
import { useTranslation } from 'react-i18next';
import { SettingSwitch } from '../../../components/settings';
import { setYouTubeConsent } from '../gameplay/youtubeConsent';
import { useYouTubeConsent } from '../gameplay/hooks/useYouTubeConsentGate';

/** Device-local choice whether YouTube background videos may load (#645); asked once before the first such song. */
export const YouTubeConsentSetting: React.FC = () => {
  const { t } = useTranslation();
  const allowed = useYouTubeConsent() === 'granted';
  return (
    <SettingSwitch
      checked={allowed}
      onChange={(checked) => setYouTubeConsent(checked ? 'granted' : 'denied')}
      label={t('melodiq.youtube_consent.setting')}
      description={t('melodiq.youtube_consent.setting_desc')}
    />
  );
};
