import React, { useState } from 'react';
import { Typography, Paper, FormControl, InputLabel, Select, MenuItem, Box, Button, Chip, Tabs, Tab } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import AppShortcutIcon from '@mui/icons-material/AppShortcut';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../../hooks/usePWAInstall';
import { PWAInstallDialog } from '../../../components/pwa';

type GeneralSubTab = 'app' | 'feedback';

export const GeneralSettings: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [subTab, setSubTab] = useState<GeneralSubTab>('app');
    const { isStandalone, isInstallable, installApp, showIOSGuide, setShowIOSGuide } = usePWAInstall();

    const handleLanguageChange = (event: SelectChangeEvent) => {
        void i18n.changeLanguage(event.target.value);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.general_title', 'Allgemeine Einstellungen')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.general_desc', 'Sprache, App-Installation und Feedback.')}
                    </Typography>
                </Box>
            </Box>

            {/* Sub-Tabs Navigation */}
            <Paper sx={{ p: 0.5, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Tabs
                    value={subTab}
                    onChange={(_, val) => setSubTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 42,
                        '& .MuiTab-root': {
                            minHeight: 42,
                            py: 1,
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            borderRadius: 2,
                            gap: 1,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                color: 'primary.main',
                                bgcolor: 'rgba(100, 180, 255, 0.1)',
                            },
                        },
                    }}
                >
                    <Tab 
                        icon={<AppShortcutIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('settings.app_and_language', 'App & Sprache')} 
                        value="app" 
                    />
                    <Tab 
                        icon={<FeedbackIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('settings.feedback_title', 'Feedback & Support')} 
                        value="feedback" 
                    />
                </Tabs>
            </Paper>

            {/* Sub-Tab 1: App & Sprache */}
            {subTab === 'app' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Language Preferences */}
                    <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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
                    <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <FeedbackIcon color="primary" />
                        <Typography variant="h6">
                            {t('settings.feedback_title', 'Feedback & Bug Report')}
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2.5 }}>
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
            )}

            <PWAInstallDialog open={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
        </Box>
    );
};

