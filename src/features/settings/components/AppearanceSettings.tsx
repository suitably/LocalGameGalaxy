import React from 'react';
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ContrastIcon from '@mui/icons-material/ContrastRounded';
import BrightnessAutoIcon from '@mui/icons-material/BrightnessAutoRounded';
import DarkModeIcon from '@mui/icons-material/DarkModeRounded';
import LightModeIcon from '@mui/icons-material/LightModeRounded';
import { useTranslation } from 'react-i18next';
import { settingsCardSx } from '../settingsStyles';
import { useColorModePreference } from '../../../context/colorModeContext';
import { COLOR_MODE_PREFERENCES, type ColorModePreference } from '../../../lib/colorMode';

const ICONS: Record<ColorModePreference, React.ReactNode> = {
  system: <BrightnessAutoIcon fontSize="small" />,
  dark: <DarkModeIcon fontSize="small" />,
  light: <LightModeIcon fontSize="small" />,
};

/** System / dark / light setting (DESIGN.md §9). TV views stay dark regardless. */
export const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { preference, setPreference } = useColorModePreference();

  return (
    <Paper id="settings-section-appearance" tabIndex={-1} sx={settingsCardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <ContrastIcon color="primary" />
        <Typography variant="h6">{t('settings.appearance_title', 'Appearance')}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {t('settings.appearance_desc', 'Colour mode of the app. TV mode is always dark.')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={preference}
        onChange={(_, next: ColorModePreference | null) => next && setPreference(next)}
        aria-label={t('settings.appearance_title', 'Appearance')}
      >
        {COLOR_MODE_PREFERENCES.map((mode) => (
          <ToggleButton key={mode} value={mode} sx={{ gap: 1 }}>
            {ICONS[mode]}
            {t(`settings.color_mode_${mode}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Paper>
  );
};
