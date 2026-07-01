import React from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';

export const Settings: React.FC = () => {
    const { t, i18n } = useTranslation();

    // Set page title
    usePageTitle(t('settings.title', 'Settings'));

    const handleLanguageChange = (event: SelectChangeEvent) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ maxWidth: 'sm', mx: 'auto', mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                {t('settings.title', 'Settings')}
            </Typography>

            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Typography variant="h6" gutterBottom>
                    {t('settings.language_preferences', 'Language Preferences')}
                </Typography>

                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel id="language-select-label">{t('settings.ui_language', 'UI Language')}</InputLabel>
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
        </Box>
    );
};
