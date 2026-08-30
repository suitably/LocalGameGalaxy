import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, IconButton, useTheme, useMediaQuery, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../context/TitleContext';
import { GeneralSettings } from './components/GeneralSettings';
import { MelodiqSettingsCategory } from './components/MelodiqSettingsCategory';
import { ServerConnection } from '../../components/connection/ServerConnection';
import { ServerAdminPanel } from '../../components/connection/ServerAdminPanel';
import { ServerSetupWizard } from '../../components/connection/ServerSetupWizard';

interface SettingsProps {
    activeGameId?: string;
    onBack?: () => void;
    onNavigateToPlaylists?: () => void;
}

type TabType = 'general' | 'server' | 'melodiq';

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
        if (gameParam.toLowerCase() === 'melodiq') return 'melodiq';
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
                        {activeTab === 'melodiq'
                            ? t('games.melodiq.title', 'Melodiq')
                            : activeTab === 'server'
                              ? t('settings.server_tab', 'Server')
                              : t('settings.title', 'Settings')}
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
                    minWidth: { md: 220 },
                    alignSelf: 'flex-start'
                }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        orientation={isMediumScreen ? 'vertical' : 'horizontal'}
                        variant={isMediumScreen ? 'standard' : 'fullWidth'}
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
                                fontSize: '1rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                                '&.Mui-selected': {
                                    color: 'primary.main'
                                }
                            }
                        }}
                    >
                        <Tab 
                            label={t('settings.general_tab', 'General')} 
                            value="general" 
                        />
                        <Tab 
                            label={t('settings.server_tab', 'Server')} 
                            value="server" 
                        />
                        <Tab 
                            label={t('games.melodiq.title', 'Melodiq')} 
                            value="melodiq" 
                        />
                    </Tabs>
                </Paper>

                {/* Content Panel */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {activeTab === 'general' && <GeneralSettings />}
                    {activeTab === 'server' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <ServerSetupWizard />
                            <ServerConnection />
                            <ServerAdminPanel />
                        </Box>
                    )}
                    {activeTab === 'melodiq' && (
                        <MelodiqSettingsCategory onNavigateToPlaylists={onNavigateToPlaylists} />
                    )}
                </Box>
            </Box>
        </Box>
    );
};
