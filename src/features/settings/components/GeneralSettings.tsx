import React from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box, Button } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { useTranslation } from 'react-i18next';

export const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();

    const handleLanguageChange = (event: SelectChangeEvent) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Typography variant="h6" gutterBottom>
                    {t('settings.feedback_title', 'Feedback & Bug Report')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                    {t('settings.feedback_desc', 'Found a bug or have a suggestion? Submit it here to create a GitHub issue via your helper server.')}
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<FeedbackIcon />}
                    onClick={() => window.dispatchEvent(new Event('feedback:open'))}
                >
                    {t('settings.submit', 'Submit Feedback')}
                </Button>
            </Paper>
        </Box>
    );
};
