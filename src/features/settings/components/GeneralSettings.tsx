import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box, Button, Alert } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import FeedbackIcon from '@mui/icons-material/Feedback';
import LanguageIcon from '@mui/icons-material/Language';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { GitHubSettings } from './GitHubSettings';
import { settingsCardSx } from '../settingsStyles';
import { resolveGitHubConfig } from '../../../lib/github';

export type GeneralSubTab = 'app' | 'feedback';

interface GeneralSettingsProps {
    activeSubTab?: GeneralSubTab;
    initialSubTab?: GeneralSubTab;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = () => {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const isMissingPatParam = searchParams.get('missing_pat') === '1';

    const [hasGithubConfig, setHasGithubConfig] = useState(() => resolveGitHubConfig().source !== 'none');

    const refreshGithubConfig = useCallback(() => {
        setHasGithubConfig(resolveGitHubConfig().source !== 'none');
    }, []);

    useEffect(() => {
        refreshGithubConfig();
    }, [refreshGithubConfig]);

    useEffect(() => {
        if (searchParams.get('sub') === 'feedback') {
            const el = document.getElementById('feedback-section');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [searchParams]);

    const handleLanguageChange = (event: SelectChangeEvent) => {
        void i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SettingsIcon color="primary" sx={{ fontSize: 30 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.general_tab', 'Allgemein')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.general_desc', 'Spracheinstellungen, Feedback und GitHub-Integration.')}
                    </Typography>
                </Box>
            </Box>

            {/* Language Preferences */}
            <Paper sx={settingsCardSx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <LanguageIcon color="primary" />
                    <Typography variant="h6">
                        {t('settings.language_preferences', 'Language Preferences')}
                    </Typography>
                </Box>

                <FormControl fullWidth sx={{ mt: 1 }}>
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

            {/* Feedback & Support Section */}
            {(!hasGithubConfig || isMissingPatParam) && (
                <Alert
                    severity="warning"
                    icon={<VpnKeyRoundedIcon fontSize="inherit" />}
                    sx={{
                        bgcolor: 'rgba(237, 108, 2, 0.15)',
                        color: '#fff',
                        border: '1px solid rgba(237, 108, 2, 0.4)',
                        '& .MuiAlert-icon': { color: '#ffb74d' },
                        borderRadius: 2.5,
                    }}
                >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {t('settings.github_missing_title', 'GitHub-Verbindung erforderlich')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {t(
                            'settings.pat_hint_feedback',
                            'Bitte hinterlege zuerst ein GitHub Personal Access Token (PAT) unten, um Feedback oder Bug-Reports als Issue zu erstellen.',
                        )}
                    </Typography>
                </Alert>
            )}

            <Paper sx={settingsCardSx} id="feedback-section">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <FeedbackIcon color="primary" />
                    <Typography variant="h6">
                        {t('settings.feedback_title', 'Feedback & Bug Report')}
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2.5 }}>
                    {t('settings.feedback_desc', 'Fehler gefunden oder einen Verbesserungsvorschlag? Reiche hier direkt Feedback ein oder erstelle ein Issue auf GitHub.')}
                </Typography>
                {hasGithubConfig ? (
                    <Button
                        variant="outlined"
                        startIcon={<FeedbackIcon />}
                        onClick={() => window.dispatchEvent(new Event('feedback:open'))}
                    >
                        {t('settings.submit', 'Submit Feedback')}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<VpnKeyRoundedIcon />}
                        onClick={() => {
                            const input = document.getElementById('github-pat-input');
                            input?.focus();
                            input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {t('settings.pat_focus_button', 'PAT-Token hinterlegen')}
                    </Button>
                )}
            </Paper>

            {/* GitHub Integration Token */}
            <GitHubSettings
                autoFocusPat={isMissingPatParam || !hasGithubConfig}
                onConfigChange={refreshGithubConfig}
            />
        </Box>
    );
};
