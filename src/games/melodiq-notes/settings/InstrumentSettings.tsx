import React, { useState } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_SOUND_CONFIG,
  getStoredSoundConfig,
  saveStoredSoundConfig,
  type InstrumentSoundConfig,
  useAudioSynth,
} from '../../../modules/audio/synth';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { InstrumentRow } from './InstrumentRow';
import { INSTRUMENT_LIST, type InstrumentPreset } from './instruments';

/** Per-instrument custom sample URL, volume and preview. Reads the stored config on every change. */
export const InstrumentSettings: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<InstrumentSoundConfig>(getStoredSoundConfig);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      <Typography variant="subtitle1" fontWeight={700}>
        {t('games.melodiq_notes.instruments')}
      </Typography>
      <Stack divider={<Divider />}>
        {INSTRUMENT_LIST.map((inst) => (
          <InstrumentRow
            key={inst.id}
            instrument={inst}
            url={config.customUrls[inst.id] || ''}
            volume={config.volumes[inst.id] ?? 1.0}
            onUrlChange={(url) => patch('customUrls', inst.id, url)}
            onVolumeChange={(vol) => patch('volumes', inst.id, vol)}
            onPreview={() => handlePreview(inst)}
          />
        ))}
      </Stack>
      <Divider />
      <Button
        fullWidth
        startIcon={<RestartAltIcon />}
        variant="outlined"
        color="inherit"
        onClick={() => setConfirmOpen(true)}
        sx={{ mt: 2 }}
      >
        {t('games.melodiq_notes.reset_foss')}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title={t('games.melodiq_notes.reset_foss')}
        message={t('games.melodiq_notes.reset_foss_confirm')}
        confirmColor="warning"
        onConfirm={() => {
          setConfirmOpen(false);
          commit({ ...DEFAULT_SOUND_CONFIG });
          onReset?.();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};
