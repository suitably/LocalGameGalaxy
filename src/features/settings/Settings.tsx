import React, { useState, lazy, Suspense } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, useTheme, useMediaQuery, Paper, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import DnsIcon from '@mui/icons-material/Dns';
import KeyIcon from '@mui/icons-material/Key';
import MicIcon from '@mui/icons-material/Mic';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings } from './components/GeneralSettings';

const ServerSettingsCategory = lazy(() => import('./components/ServerSettingsCategory').then(m => ({ default: m.ServerSettingsCategory })));
const ApiKeysSettings = lazy(() => import('./components/ApiKeysSettings').then(m => ({ default: m.ApiKeysSettings })));
const MelodiqSettingsCategory = lazy(() => import('./components/MelodiqSettingsCategory').then(m => ({ default: m.MelodiqSettingsCategory })));

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

type TabType = 'general' | 'server' | 'keys' | 'melodiq';

export const Settings: React.FC<SettingsProps> = ({ activeGameId, onBack, onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const isMediumScreen = useMediaQuery(theme.breakpoints.up('md'));

    // Set page title
    usePageTitle(t('settings.title', 'Settings'));

    // Determine initial tab from props or URL
    const gameParam = activeGameId || searchParams.get('game') || '';
    const tabParam = searchParams.get('tab') || '';

    const resolveInitialTab = (): TabType => {
        if (tabParam === 'server') return 'server';
        if (tabParam === 'keys' || tabParam === 'apikeys' || tabParam === 'api') return 'keys';
        if (tabParam === 'melodiq' || gameParam.toLowerCase() === 'melodiq') return 'melodiq';
        return 'general';
    };

    const [activeTab, setActiveTab] = useState<TabType>(resolveInitialTab);

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
            case 'server':
                return t('settings.server_tab', 'Server & Netzwerk');
            case 'keys':
                return t('settings.api_keys_tab', 'API-Keys & Integrationen');
            case 'melodiq':
                return t('games.melodiq.title', 'Melodiq');
            default:
                return t('settings.general_tab', 'Allgemein');
        }
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 'lg', mx: 'auto', mt: { xs: 2, md: 4 }, pb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
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

            {/* Layout Grid */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Sidebar Navigation */}
                <Paper sx={{ 
                    p: 1.5, 
                    borderRadius: 3, 
                    bgcolor: 'rgba(30, 30, 40, 0.7)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    boxShadow: 6,
                    minWidth: { md: 240 },
                    alignSelf: 'flex-start'
                }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        orientation={isMediumScreen ? 'vertical' : 'horizontal'}
                        variant={isMediumScreen ? 'standard' : 'scrollable'}
                        scrollButtons="auto"
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{
                            borderRight: isMediumScreen ? 1 : 0,
                            borderBottom: !isMediumScreen ? 1 : 0,
                            borderColor: 'divider',
                            '.MuiTab-root': {
                                alignItems: isMediumScreen ? 'flex-start' : 'center',
                                textTransform: 'none',
                                fontWeight: 'bold',
                                py: 1.5,
                                px: 2,
                                fontSize: '0.95rem',
                                color: 'rgba(255, 255, 255, 0.65)',
                                minHeight: 48,
                                gap: 1.5,
                                borderRadius: 2,
                                mb: isMediumScreen ? 0.5 : 0,
                                transition: 'all 0.2s ease',
                                '&.Mui-selected': {
                                    color: 'primary.main',
                                    bgcolor: 'rgba(100, 180, 255, 0.08)',
                                }
                            }
                        }}
                    >
                        <Tab 
                            icon={<SettingsIcon fontSize="small" />}
                            iconPosition="start"
                            label={t('settings.general_tab', 'Allgemein')} 
                            value="general" 
                        />
                        <Tab 
                            icon={<DnsIcon fontSize="small" />}
                            iconPosition="start"
                            label={t('settings.server_tab', 'Server & Netzwerk')} 
                            value="server" 
                        />
                        <Tab 
                            icon={<KeyIcon fontSize="small" />}
                            iconPosition="start"
                            label={t('settings.api_keys_tab', 'API-Keys')} 
                            value="keys" 
                        />
                        <Tab 
                            icon={<MicIcon fontSize="small" />}
                            iconPosition="start"
                            label={t('games.melodiq.title', 'Melodiq')} 
                            value="melodiq" 
                        />
                    </Tabs>
                </Paper>

                {/* Content Panel */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {activeTab === 'general' && <GeneralSettings />}
                    {activeTab === 'server' && (
                        <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                            <ServerSettingsCategory />
                        </Suspense>
                    )}
                    {activeTab === 'keys' && (
                        <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                            <ApiKeysSettings />
                        </Suspense>
                    )}
                    {activeTab === 'melodiq' && (
                        <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                            <MelodiqSettingsCategory 
                                onNavigateToPlaylists={onNavigateToPlaylists} 
                                onNavigateToServer={() => setActiveTab('server')}
                            />
                        </Suspense>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
