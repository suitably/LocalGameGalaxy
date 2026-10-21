/**
 * Soundfont provider select plus custom base URL field [ID: COMP-NOTES-SOUNDFONT-FIELDS]
 *
 * Used by the in-game sound settings and the Melodiq Notes settings page.
 */
import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { InstrumentSoundConfig, SoundfontProvider } from '../logic/soundSettings';

interface SoundfontProviderFieldsProps {
  config: InstrumentSoundConfig;
  onChange: (next: InstrumentSoundConfig) => void;
  /** Space between the select and the custom URL field. */
  gap?: number;
  urlPlaceholder?: string;
}

const PROVIDERS: SoundfontProvider[] = ['fluid', 'musyng', 'synth', 'custom'];

export const SoundfontProviderFields: React.FC<SoundfontProviderFieldsProps> = ({
  config,
  onChange,
  gap = 0,
  urlPlaceholder,
}) => {
  const { t } = useTranslation();
  const isCustom = config.provider === 'custom';

  return (
    <>
      <FormControl fullWidth size="small" sx={{ mb: isCustom ? gap : 0 }}>
        <InputLabel>{t('games.melodiq_notes.soundfont_provider')}</InputLabel>
        <Select
          value={config.provider}
          label={t('games.melodiq_notes.soundfont_provider')}
          onChange={(e) => onChange({ ...config, provider: e.target.value as SoundfontProvider })}
        >
          {PROVIDERS.map((p) => (
            <MenuItem key={p} value={p}>
              {t(`games.melodiq_notes.soundfont_${p}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isCustom && (
        <TextField
          fullWidth
          size="small"
          label={t('games.melodiq_notes.soundfont_custom')}
          value={config.customBaseUrl || ''}
          placeholder={urlPlaceholder}
          onChange={(e) => onChange({ ...config, customBaseUrl: e.target.value })}
        />
      )}
    </>
  );
};
