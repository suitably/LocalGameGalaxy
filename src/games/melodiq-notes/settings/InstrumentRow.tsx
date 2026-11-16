import React from 'react';
import { Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import { useTranslation } from 'react-i18next';
import { SettingSlider } from '../../../components/settings';
import type { InstrumentPreset } from './instruments';

interface InstrumentRowProps {
  instrument: InstrumentPreset;
  url: string;
  volume: number;
  onUrlChange: (url: string) => void;
  onVolumeChange: (volume: number) => void;
  onPreview: () => void;
}

/** One instrument: name + preview on top, sample URL and volume below. Sized by its container, not the viewport. */
export const InstrumentRow: React.FC<InstrumentRowProps> = ({
  instrument,
  url,
  volume,
  onUrlChange,
  onVolumeChange,
  onPreview,
}) => {
  const { t } = useTranslation();
  const percent = Math.round(volume * 100);
  const volumeLabel = t('games.melodiq_notes.instrument_volume', { name: instrument.name });
  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {instrument.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('games.melodiq_notes.gm_program', { n: instrument.defaultMidi })}
          </Typography>
        </Box>
        <Tooltip title={t('games.melodiq_notes.test_sound')}>
          <IconButton
            color="primary"
            onClick={onPreview}
            aria-label={`${t('games.melodiq_notes.test_sound')}: ${instrument.name}`}
          >
            <VolumeUpIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <TextField
        fullWidth
        size="small"
        label={t('games.melodiq_notes.custom_sound_url')}
        placeholder={t('games.melodiq_notes.custom_sound_url_placeholder')}
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        sx={{ mt: 1 }}
      />
      <SettingSlider
        label={`${t('games.melodiq_notes.volume')}: ${percent}%`}
        aria-label={volumeLabel}
        size="small"
        value={percent}
        min={0}
        max={120}
        onChange={(_, val) => onVolumeChange((val as number) / 100)}
      />
    </Box>
  );
};
