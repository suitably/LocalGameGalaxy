import React from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SettingsResetButton } from '../../../components/settings';
import { GameSettingsPanel } from '../components/GameSettingsPanel';
import { DEFAULT_SETTINGS, useMelodiqSettings } from '../hooks/SettingsContext';
import { initMelodiqI18n } from '../i18n';

initMelodiqI18n();

/** Melodiq host gameplay settings with "reset to defaults" (profiles stay untouched). */
export const MelodiqGameplaySection: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSetting, resetSettings } = useMelodiqSettings();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <GameSettingsPanel settings={settings} onUpdateSetting={updateSetting} />
      <Box>
        <SettingsResetButton
          onReset={() => resetSettings(DEFAULT_SETTINGS)}
          confirmMessage={t(
            'melodiq.settings.reset_confirm',
            'Alle Spieleinstellungen auf Standardwerte zurücksetzen? Profile bleiben unberührt.',
          )}
        />
      </Box>
    </Box>
  );
};
