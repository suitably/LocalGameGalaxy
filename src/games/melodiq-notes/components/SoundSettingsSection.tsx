import React, { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import { useTranslation } from 'react-i18next';
import { SoundfontProviderFields } from './SoundfontProviderFields';
import {
  getStoredSoundConfig,
  saveStoredSoundConfig,
  type InstrumentSoundConfig,
} from '../logic/soundSettings';
import { useAudioSynth } from '../useAudioSynth';

interface SoundSettingsSectionProps {
  onSoundConfigChanged?: () => void;
}

export const SoundSettingsSection: React.FC<SoundSettingsSectionProps> = ({
  onSoundConfigChanged,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
  const { playInstrumentNote } = useAudioSynth();

  const handleConfigChange = (next: InstrumentSoundConfig) => {
    setConfig(next);
    saveStoredSoundConfig(next);
    onSoundConfigChanged?.();
  };

  const handleTestSound = () => {
    playInstrumentNote({
      midiPitch: 64, // E4
      durationSeconds: 0.7,
      velocity: 0.9,
      category: 'guitar',
      midiProgram: 27,
    });
  };

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
        sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1.5 }}
      >
        {t('games.melodiq_notes.sound_settings', 'Sound & Klänge')}
      </Typography>
      <Stack spacing={1.5}>
        <SoundfontProviderFields config={config} onChange={handleConfigChange} />

        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}
        >
          <Button
            startIcon={<VolumeUpIcon />}
            variant="outlined"
            size="small"
            onClick={handleTestSound}
            sx={{ borderRadius: 2 }}
          >
            {t('games.melodiq_notes.test_sound', 'Probe anhören')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
