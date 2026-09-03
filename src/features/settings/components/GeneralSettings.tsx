import React from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box, Button, Chip } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { PWAInstallDialog } from '../../../components/pwa';
import { GitHubSettings } from './GitHubSettings';
import { NotificationSettings } from '../../../components/push/NotificationSettings';

export const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } = usePWAInstall();

    const handleLanguageChange = (event: SelectChangeEvent) => {
        i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* PWA / App Installation Info */}
            <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
                    <Typography variant="h6">
                        {t('settings.pwa_title', 'App Installation (PWA)')}
                    </Typography>
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

            {/* Notifications (Push Permission + Relay Config) */}
            <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Typography variant="h6" gutterBottom>
                    {t('settings.notifications_title', 'Benachrichtigungen')}
                </Typography>
                <NotificationSettings />
            </Paper>

            {/* Language Preferences */}
            <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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

            {/* GitHub Integration */}
            <GitHubSettings />

            {/* Feedback & Bug Report */}
            <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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

            <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
        </Box>
    );
};

