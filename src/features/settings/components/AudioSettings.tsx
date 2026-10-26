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
      title={t('settings.audio.title', 'Audio input')}
      description={t(
        'settings.audio.desc',
        'Microphones that games may use, for example for singing.',
      )}
      icon={<MicIcon color="primary" />}
    >
      <AudioInputSettings />
    </SettingsSection>
  );
};
