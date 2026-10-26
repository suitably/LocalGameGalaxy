import React, { useState } from 'react';
import { Stack } from '@mui/material';
import { SoundSettingsSection } from '../components/SoundSettingsSection';
import { InstrumentSettings } from './InstrumentSettings';

/** Melodiq Notes "Sounds" settings: soundfont provider + per-instrument mapping. */
export const NotesSoundsSection: React.FC = () => {
  const [version, setVersion] = useState(0);
  return (
    <Stack spacing={3}>
      <SoundSettingsSection key={version} />
      <InstrumentSettings onReset={() => setVersion((v) => v + 1)} />
    </Stack>
  );
};
