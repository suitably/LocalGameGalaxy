import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useTranslation } from 'react-i18next';
import { ServerConnection } from '../../../components/connection/ServerConnection';
import { ServerSetupWizard } from '../../../components/connection/ServerSetupWizard';
import { NotificationSettings } from '../../../components/push/NotificationSettings';

type ServerSubTab = 'connection' | 'setup' | 'notifications';

export const ServerSettingsCategory: React.FC = () => {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState<ServerSubTab>('connection');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DnsIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.server_category_title', 'Server & Netzwerk')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.server_category_desc', 'Verbindung zum Melodiq- / Nexumia-Begleit-Server für Audio-Streaming, YouTube-Downloads, P2P-Relay und Push-Benachrichtigungen.')}
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
                        icon={<DnsIcon fontSize="small" />} 
                        iconPosition="start" 
                        label="Verbindung & Status" 
                        value="connection" 
                    />
                    <Tab 
                        icon={<AutoFixHighIcon fontSize="small" />} 
                        iconPosition="start" 
                        label="Setup-Assistent" 
                        value="setup" 
                    />
                    <Tab 
                        icon={<NotificationsActiveIcon fontSize="small" />} 
                        iconPosition="start" 
                        label="Push & Benachrichtigungen" 
                        value="notifications" 
                    />
                </Tabs>
            </Paper>

            {/* Sub-Tab Content */}
            {subTab === 'connection' && <ServerConnection />}
            {subTab === 'setup' && <ServerSetupWizard />}
            {subTab === 'notifications' && (
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <NotificationsActiveIcon color="primary" />
                        <Typography variant="h6">
                            {t('settings.notifications_title', 'Benachrichtigungen & Push-Relay')}
                        </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        {t('settings.notifications_desc', 'Erhalte Push-Benachrichtigungen bei Runden- und Spiel-Ereignissen über ntfy oder den Web-Push Relay Server.')}
                    </Typography>
                    <NotificationSettings />
                </Paper>
            )}
        </Box>
    );
};
