import React from 'react';
import MicIcon from '@mui/icons-material/MicRounded';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from '../../../components/settings';
import { AudioInputSettings } from '../../../modules/audio';

/** Audio page: input devices (enable, rename, level meter). */
export const AudioSettings: React.FC = () => {
  const { t } = useTranslation();
  return (
    <SettingsSection
      id="audio-input"
      title={t('settings.audio.title')}
      description={t('settings.audio.desc')}
      icon={<MicIcon color="primary" />}
    >
      <AudioInputSettings />
    </SettingsSection>
  );
};
