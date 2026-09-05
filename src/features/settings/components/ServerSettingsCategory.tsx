import React from 'react';
import { Box, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useTranslation } from 'react-i18next';
import { ServerConnection } from '../../../components/connection/ServerConnection';
import { ServerSetupWizard } from '../../../components/connection/ServerSetupWizard';
import { NotificationSettings } from '../../../components/push/NotificationSettings';
import { Paper } from '@mui/material';

export const ServerSettingsCategory: React.FC = () => {
    const { t } = useTranslation();

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

            {/* 1. Live Connection Status & Manual Config */}
            <ServerConnection />

            {/* 2. Automated Setup Wizard (Docker, Binary, Quick Setup) */}
            <ServerSetupWizard />

            {/* 3. Notifications & Push Relay */}
            <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <NotificationsActiveIcon color="primary" />
                    <Typography variant="h6">
                        {t('settings.notifications_title', 'Benachrichtigungen & Push-Relay')}
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('settings.notifications_desc', 'Erhalte Push-Benachrichtigungen bei Runden- und Spiel-Ereignissen über ntfy oder den Web-Push Relay Server.')}
                </Typography>
                <NotificationSettings />
            </Paper>
        </Box>
    );
};
