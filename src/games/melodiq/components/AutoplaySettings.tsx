import React from 'react';
import { Box, Typography, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface AutoplaySelectProps {
  label: string;
  description: string;
  value: number;
  /** Delay choices in seconds; 0 means "off / manual". */
  delays: number[];
  onChange: (seconds: number) => void;
}

const AutoplaySelect: React.FC<AutoplaySelectProps> = ({
  label,
  description,
  value,
  delays,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => onChange(e.target.value as number)}
        sx={{ borderRadius: 2 }}
      >
        <MenuItem value={0}>{t('melodiq.settings_panel.off_manual')}</MenuItem>
        {delays.map((seconds) => (
          <MenuItem key={seconds} value={seconds}>
            {t('melodiq.settings_panel.seconds', { count: seconds })}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {description}
      </Typography>
    </FormControl>
  );
};

interface AutoplaySettingsProps {
  noPlayersDelay: number;
  withPlayersDelay: number;
  onNoPlayersDelayChange: (seconds: number) => void;
  onWithPlayersDelayChange: (seconds: number) => void;
}

/** Delay before the next song starts on its own, with and without singers. */
export const AutoplaySettings: React.FC<AutoplaySettingsProps> = ({
  noPlayersDelay,
  withPlayersDelay,
  onNoPlayersDelayChange,
  onWithPlayersDelayChange,
}) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('melodiq.settings_panel.autoplay')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <AutoplaySelect
          label={t('melodiq.settings_panel.autoplay_no_singers')}
          description={t('melodiq.settings_panel.autoplay_no_singers_desc')}
          value={noPlayersDelay}
          delays={[5, 10, 15, 30]}
          onChange={onNoPlayersDelayChange}
        />
        <AutoplaySelect
          label={t('melodiq.settings_panel.autoplay_singers')}
          description={t('melodiq.settings_panel.autoplay_singers_desc')}
          value={withPlayersDelay}
          delays={[10, 20, 30, 60]}
          onChange={onWithPlayersDelayChange}
        />
      </Box>
    </Box>
  );
};
