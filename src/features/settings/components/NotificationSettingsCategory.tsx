import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useTranslation } from 'react-i18next';
import { NotificationSettings } from '../../../components/push/NotificationSettings';
import { settingsCardSx } from '../settingsStyles';

export const NotificationSettingsCategory: React.FC = () => {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <NotificationsActiveIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.notifications_title', 'Benachrichtigungen & Push-Relay')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.notifications_desc', 'Globale Push-Benachrichtigungen bei Rundenwechseln, Spielzügen und Multiplayer-Lobbys über Web Push oder ntfy.')}
                    </Typography>
                </Box>
            </Box>

            {/* Main Notifications Card */}
            <Paper id="settings-section-notifications" sx={settingsCardSx}>
                <NotificationSettings />
            </Paper>
        </Box>
    );
};
