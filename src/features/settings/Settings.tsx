import React, { useState, lazy, Suspense } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import KeyIcon from '@mui/icons-material/Key';
import MicIcon from '@mui/icons-material/Mic';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings } from './components/GeneralSettings';
import type { MelodiqSubTab } from './components/MelodiqSettingsCategory';

const NotificationSettingsCategory = lazy(() => import('./components/NotificationSettingsCategory').then(m => ({ default: m.NotificationSettingsCategory })));
const ApiKeysSettings = lazy(() => import('./components/ApiKeysSettings').then(m => ({ default: m.ApiKeysSettings })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

type TabType = 'general' | 'notifications' | 'melodiq' | 'keys';

export const Settings: React.FC<SettingsProps> = ({ activeGameId, onBack, onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Set page title
    usePageTitle(t('settings.title', 'Settings'));

    // Determine initial tab from props or URL
    const gameParam = activeGameId || searchParams.get('game') || '';
    const tabParam = searchParams.get('tab') || '';

    const resolveInitialTab = (): TabType => {
        if (tabParam === 'notifications' || tabParam === 'push' || tabParam === 'ntfy') return 'notifications';
        if (tabParam === 'server' || tabParam === 'melodiq' || gameParam.toLowerCase() === 'melodiq') return 'melodiq';
        if (tabParam === 'keys' || tabParam === 'apikeys' || tabParam === 'api' || tabParam === 'github') return 'keys';
        return 'general';
    };

    const [activeTab, setActiveTab] = useState<TabType>(resolveInitialTab);
    const melodiqInitialSubTab: MelodiqSubTab = tabParam === 'server' ? 'server' : 'server';

    const handleTabChange = (_event: React.SyntheticEvent, newValue: TabType) => {
        setActiveTab(newValue);
    };

    const handleBackClick = () => {
        if (onBack) {
            onBack();
        } else {
            // Default back navigation
            const game = searchParams.get('game');
            if (game) {
                navigate(`/games/${game}`);
            } else {
                navigate('/');
            }
        }
    };

    const getTabSubtitle = () => {
        switch (activeTab) {
            case 'notifications':
                return t('settings.notifications_tab', 'Benachrichtigungen & Push');
            case 'keys':
                return t('settings.api_keys_tab', 'API-Keys & Integrationen');
            case 'melodiq':
                return t('games.melodiq.title', 'Melodiq & Companion Server');
            default:
                return t('settings.general_tab', 'Allgemein');
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 'lg', mx: 'auto', mt: { xs: 2, md: 4 }, pb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={handleBackClick} color="primary" aria-label="back">
                    <ArrowBackIcon />
                </IconButton>
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                        {t('settings.title', 'Settings')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {getTabSubtitle()}
                    </Typography>
                </Box>
            </Box>

            {/* Top Main Navigation Tabs */}
            <Paper sx={{ 
                p: 0.5, 
                mb: 3.5, 
                borderRadius: 3, 
                bgcolor: 'rgba(30, 30, 40, 0.7)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                boxShadow: 4 
            }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 48,
                        '& .MuiTab-root': {
                            minHeight: 48,
                            py: 1.5,
                            px: { xs: 2, sm: 3 },
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: { xs: '0.875rem', sm: '0.95rem' },
                            borderRadius: 2,
                            gap: 1.2,
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&.Mui-selected': {
                                color: 'primary.main',
                                bgcolor: 'rgba(100, 180, 255, 0.12)',
                            },
                        },
                    }}
                >
                    <Tab 
                        icon={<SettingsIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('settings.general_tab', 'Allgemein')} 
                        value="general" 
                    />
                    <Tab 
                        icon={<NotificationsActiveIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('settings.notifications_tab', 'Benachrichtigungen')} 
                        value="notifications" 
                    />
                    <Tab 
                        icon={<MicIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('games.melodiq.title', 'Melodiq')} 
                        value="melodiq" 
                    />
                    <Tab 
                        icon={<KeyIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('settings.api_keys_tab', 'API-Keys')} 
                        value="keys" 
                    />
                </Tabs>
            </Paper>

            {/* Content Area with Sub-Tabs in each Category */}
            <Box sx={{ width: '100%' }}>
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'notifications' && (
                    <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                        <NotificationSettingsCategory />
                    </Suspense>
                )}
                {activeTab === 'melodiq' && (
                    <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                        <MelodiqSettingsCategory 
                            initialSubTab={melodiqInitialSubTab}
                            onNavigateToPlaylists={onNavigateToPlaylists} 
                        />
                    </Suspense>
                )}
                {activeTab === 'keys' && (
                    <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                        <ApiKeysSettings />
                    </Suspense>
                )}
            </Box>
        </Box>
    );
};
