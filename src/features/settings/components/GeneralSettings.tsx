import React from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import LanguageIcon from '@mui/icons-material/LanguageRounded';
import { useTranslation } from 'react-i18next';
import { AppearanceSettings } from './AppearanceSettings';
import { settingsCardSx } from '../settingsStyles';

/** General page: UI language and colour mode. */
export const GeneralSettings: React.FC = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (event: SelectChangeEvent) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Language Preferences */}
      <Paper id="settings-section-language" tabIndex={-1} sx={settingsCardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <LanguageIcon color="primary" />
          <Typography variant="h6">
            {t('settings.language_preferences', 'Language Preferences')}
          </Typography>
        </Box>

        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel id="language-select-label">
            {t('settings.ui_language', 'UI Language')}
          </InputLabel>
          <Select
            labelId="language-select-label"
            id="language-select"
            value={i18n.language.startsWith('de') ? 'de' : 'en'}
            label={t('settings.ui_language', 'UI Language')}
            onChange={handleLanguageChange}
          >
            <MenuItem value="en">{t('settings.english', 'English')}</MenuItem>
            <MenuItem value="de">{t('settings.german', 'Deutsch')}</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <AppearanceSettings />
    </Box>
  );
};
