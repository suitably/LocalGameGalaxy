import React, { useState } from 'react';
import {
  alpha,
  Box,
  Button,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_SOUND_CONFIG,
  getStoredSoundConfig,
  saveStoredSoundConfig,
  type InstrumentSoundConfig,
} from '../logic/soundSettings';
import { useAudioSynth } from '../useAudioSynth';
import { INSTRUMENT_LIST, type InstrumentPreset } from './instruments';

/** Per-instrument custom sample URL, volume and preview. Reads the stored config on every change. */
export const InstrumentSettings: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
  const { playInstrumentNote } = useAudioSynth();

  const commit = (next: InstrumentSoundConfig) => {
    setConfig(next);
    saveStoredSoundConfig(next);
  };

  // The provider is edited by a sibling section, so always merge into the freshest stored config.
  const patch = (key: 'volumes' | 'customUrls', id: string, value: number | string) => {
    const current = getStoredSoundConfig();
    commit({ ...current, [key]: { ...current[key], [id]: value } });
  };

  const handlePreview = (inst: InstrumentPreset) => {
    playInstrumentNote({
      midiPitch: inst.previewPitch,
      durationSeconds: 0.8,
      velocity: 0.85,
      category: inst.category,
      midiProgram: inst.defaultMidi,
      partId: inst.id,
      volume: config.volumes[inst.id] ?? 1.0,
    });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('games.melodiq_notes.instruments', 'Instrumente')}
        </Typography>
        <Button
          startIcon={<RestartAltIcon />}
          size="small"
          color="secondary"
          onClick={() => {
            commit({ ...DEFAULT_SOUND_CONFIG });
            onReset?.();
          }}
        >
          {t('games.melodiq_notes.reset_foss', 'Auf FOSS-Standard zurücksetzen')}
        </Button>
      </Stack>

      <Stack spacing={2.5}>
        {INSTRUMENT_LIST.map((inst) => {
          const vol = config.volumes[inst.id] ?? 1.0;
          return (
            <Paper
              key={inst.id}
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02),
                borderColor: (theme) => alpha(theme.palette.text.primary, 0.08),
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
              >
                <Box sx={{ minWidth: 160 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {inst.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    GM #{inst.defaultMidi}
                  </Typography>
                </Box>
                <TextField
                  size="small"
                  label={t('games.melodiq_notes.custom_sound_url')}
                  placeholder="Audio URL / Sample"
                  value={config.customUrls[inst.id] || ''}
                  onChange={(e) => patch('customUrls', inst.id, e.target.value)}
                  sx={{ minWidth: 200, flex: 1 }}
                />
                <Box sx={{ width: 140, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Vol:
                  </Typography>
                  <Slider
                    size="small"
                    value={Math.round(vol * 100)}
                    min={0}
                    max={120}
                    onChange={(_, val) => patch('volumes', inst.id, (val as number) / 100)}
                  />
                  <Typography variant="caption" sx={{ minWidth: 30 }}>
                    {Math.round(vol * 100)}%
                  </Typography>
                </Box>
                <Tooltip title={t('games.melodiq_notes.test_sound')}>
                  <IconButton color="primary" onClick={() => handlePreview(inst)}>
                    <VolumeUpIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};
