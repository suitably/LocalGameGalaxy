import React, { useState, lazy, Suspense } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MicIcon from '@mui/icons-material/Mic';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings, type GeneralSubTab } from './components/GeneralSettings';
import type { MelodiqSubTab } from './components/MelodiqSettingsCategory';
import { mainTabsBarSx, mainTabSx } from './settingsStyles';

const NotificationSettingsCategory = lazy(() => import('./components/NotificationSettingsCategory').then(m => ({ default: m.NotificationSettingsCategory })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

type TabType = 'general' | 'notifications' | 'melodiq';

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
        return 'general';
    };

    const [activeTab, setActiveTab] = useState<TabType>(resolveInitialTab);
    const melodiqInitialSubTab: MelodiqSubTab = tabParam === 'server' ? 'server' : 'server';
    const generalInitialSubTab: GeneralSubTab = (tabParam === 'keys' || tabParam === 'github' || tabParam === 'feedback') ? 'feedback' : 'app';

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

            {/* Level 1: Main Category Tabs Bar */}
            <Paper sx={mainTabsBarSx}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    TabIndicatorProps={{ style: { display: 'none' } }}
                    sx={{
                        minHeight: 46,
                        '& .MuiTabs-flexContainer': {
                            gap: 1,
                        },
                    }}
                >
                    <Tab 
                        icon={<SettingsIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('settings.general_tab', 'Allgemein')} 
                        value="general" 
                        sx={mainTabSx}
                    />
                    <Tab 
                        icon={<NotificationsActiveIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('settings.notifications_tab', 'Benachrichtigungen')} 
                        value="notifications" 
                        sx={mainTabSx}
                    />
                    <Tab 
                        icon={<MicIcon fontSize="small" />}
                        iconPosition="start"
                        label={t('games.melodiq.title', 'Melodiq')} 
                        value="melodiq" 
                        sx={mainTabSx}
                    />
                </Tabs>
            </Paper>

            {/* Content Area with Sub-Tabs in each Category */}
            <Box sx={{ width: '100%' }}>
                {activeTab === 'general' && <GeneralSettings initialSubTab={generalInitialSubTab} />}
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
            </Box>
        </Box>
    );
};
