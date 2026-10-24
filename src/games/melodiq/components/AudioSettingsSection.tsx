import React, { useState } from 'react';
import { Box, Typography, Slider, Button } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import { useTranslation } from 'react-i18next';
import type { SettingsState } from '../hooks/SettingsContext';
import { useDirectVolumeSliders } from '../hooks/useDirectVolumeSliders';
import { SettingSlider, SettingToggleGroup } from './GameSettingsControls';
import { LatencyCalibratorDialog } from './LatencyCalibratorDialog';

interface AudioSettingsSectionProps {
  settings: SettingsState;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

const LATENCY_MARKS = [0, 100, 250, 500].map((value) => ({ value, label: `${value}ms` }));

/** Playback mode, volumes and microphone latency. */
export const AudioSettingsSection: React.FC<AudioSettingsSectionProps> = ({
  settings,
  onUpdateSetting,
}) => {
  const { t } = useTranslation();
  const volumes = useDirectVolumeSliders(settings, onUpdateSetting);
  const [calibratorOpen, setCalibratorOpen] = useState(false);
  const mode = settings.audioPlaybackMode ?? 'separated';
  const isOriginal = settings.audioPlaybackMode === 'original';

  const volumeSlider = (label: string, slider: typeof volumes.song, disabled = false) => (
    <SettingSlider
      label={`${label}: ${slider.value}%`}
      value={slider.value}
      onChange={(_, val) => slider.onChange(val as number)}
      onChangeCommitted={(_, val) => slider.onCommit(val as number)}
      min={0}
      max={100}
      disabled={disabled}
    />
  );

  return (
    <>
      <SettingToggleGroup
        title={t('melodiq.settings_panel.audio_playback_mode', 'Audio Playback Mode')}
        value={mode}
        options={[
          {
            value: 'separated',
            label: t('melodiq.settings_panel.mode_separated', 'Separated Stems'),
          },
          { value: 'original', label: t('melodiq.settings_panel.mode_original', 'Original Audio') },
        ]}
        onChange={(val) => onUpdateSetting('audioPlaybackMode', val)}
        description={
          mode === 'separated'
            ? t(
                'melodiq.settings_panel.mode_separated_desc',
                'Plays separated instrumental and vocal stems when available. Allows independent vocal volume control.',
              )
            : t(
                'melodiq.settings_panel.mode_original_desc',
                'Plays the untouched original audio track directly.',
              )
        }
      />

      {volumeSlider(t('melodiq.settings_panel.song_volume'), volumes.song)}
      <Box sx={{ opacity: isOriginal ? 0.5 : 1 }}>
        {volumeSlider(
          t('melodiq.settings_panel.vocals_volume') +
            (isOriginal
              ? ` (${t('melodiq.settings_panel.disabled_in_original_mode', 'Separated stems only')})`
              : ''),
          volumes.vocals,
          isOriginal,
        )}
      </Box>
      {volumeSlider(t('melodiq.settings_panel.master_volume'), volumes.master)}

      <Box sx={{ mt: 2 }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
        >
          <Typography gutterBottom sx={{ mb: 0, fontVariantNumeric: 'tabular-nums' }}>
            {t('melodiq.settings_panel.mic_latency', 'Microphone Latency Offset')}:{' '}
            {settings.micLatency ?? 0} ms
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<SpeedIcon />}
            onClick={() => setCalibratorOpen(true)}
          >
            {t('melodiq.settings_panel.calibrate', 'Calibrate')}
          </Button>
        </Box>
        <Slider
          value={settings.micLatency ?? 0}
          onChange={(_, val) => onUpdateSetting('micLatency', val as number)}
          min={-100}
          max={500}
          step={5}
          marks={LATENCY_MARKS}
          valueLabelDisplay="auto"
          sx={{ width: '100%' }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t(
            'melodiq.settings_panel.mic_latency_desc',
            'Compensates for microphone and audio hardware delay to align pitch detection with note bars.',
          )}
        </Typography>
      </Box>

      <LatencyCalibratorDialog open={calibratorOpen} onClose={() => setCalibratorOpen(false)} />
    </>
  );
};
