import React from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box, Button, Chip } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanguageIcon from '@mui/icons-material/Language';
import AppShortcutIcon from '@mui/icons-material/AppShortcut';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { PWAInstallDialog } from '../../../components/pwa';
import { GitHubSettings } from './GitHubSettings';
import { settingsCardSx } from '../settingsStyles';

export type GeneralSubTab = 'app' | 'feedback';

interface GeneralSettingsProps {
    activeSubTab?: GeneralSubTab;
    initialSubTab?: GeneralSubTab;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ activeSubTab, initialSubTab = 'app' }) => {
    const { t, i18n } = useTranslation();
    const subTab = activeSubTab || initialSubTab;
    const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } = usePWAInstall();

    const handleLanguageChange = (event: SelectChangeEvent) => {
        void i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {subTab === 'app' ? <AppShortcutIcon color="primary" sx={{ fontSize: 30 }} /> : <FeedbackIcon color="primary" sx={{ fontSize: 30 }} />}
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {subTab === 'app' ? t('settings.app_and_language', 'App & Sprache') : t('settings.feedback_title', 'Feedback & Support')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {subTab === 'app'
                            ? t('settings.app_lang_desc', 'Spracheinstellungen, PWA-Installation und Anzeigeoptionen.')
                            : t('settings.feedback_desc', 'Feedback senden, Bug-Reports verwalten und GitHub-Integration einrichten.')}
                    </Typography>
                </Box>
            </Box>

            {/* Sub-Tab 1: App & Sprache */}
            {subTab === 'app' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

                    {/* PWA / App Installation Info */}
                    <Paper sx={settingsCardSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <InstallMobileIcon color="primary" />
                                <Typography variant="h6">
                                    {t('settings.pwa_title', 'App Installation (PWA)')}
                                </Typography>
                            </Box>
                            {isStandalone ? (
                                <Chip 
                                    icon={<CheckCircleIcon />} 
                                    label={t('app.pwa_installed', 'Installed (Standalone)')} 
                                    color="success" 
                                    size="small" 
                                    variant="outlined" 
                                />
                            ) : (
                                <Chip 
                                    label="Web Browser" 
                                    color="default" 
                                    size="small" 
                                    variant="outlined" 
                                />
                            )}
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2.5 }}>
                            {isStandalone 
                                ? t('settings.pwa_status_standalone', 'The app is currently running in full-screen standalone mode (PWA).')
                                : t('settings.pwa_status_browser', 'The app is running inside a web browser. Install the PWA to remove browser toolbars and search bars for a native mobile experience.')}
                        </Typography>
                        {!isStandalone && isInstallable && (
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<InstallMobileIcon />}
                                onClick={installApp}
                                sx={{ borderRadius: 2 }}
                            >
                                {t('app.install_pwa', 'Install App')}
                            </Button>
                        )}
                    </Paper>
                </Box>
            )}

            {/* Sub-Tab 2: Feedback & Support */}
            {subTab === 'feedback' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Paper sx={settingsCardSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <FeedbackIcon color="primary" />
                            <Typography variant="h6">
                                {t('settings.feedback_title', 'Feedback & Bug Report')}
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2.5 }}>
                            {t('settings.feedback_desc', 'Fehler gefunden oder einen Verbesserungsvorschlag? Reiche hier direkt Feedback ein oder erstelle ein Issue auf GitHub.')}
                        </Typography>
                        <Button
                            variant="outlined"
                            startIcon={<FeedbackIcon />}
                            onClick={() => window.dispatchEvent(new Event('feedback:open'))}
                        >
                            {t('settings.submit', 'Submit Feedback')}
                        </Button>
                    </Paper>

                    {/* GitHub Integration Token */}
                    <GitHubSettings />
                </Box>
            )}

            <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
        </Box>
    );
};

