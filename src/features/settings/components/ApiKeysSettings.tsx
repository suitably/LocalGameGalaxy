import React from 'react';
import { Box, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import { useTranslation } from 'react-i18next';
import { ServerAdminPanel } from '../../../components/connection/ServerAdminPanel';
import { GitHubSettings } from './GitHubSettings';

export const ApiKeysSettings: React.FC = () => {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <KeyIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.api_keys_category_title', 'API-Keys & Integrationen')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.api_keys_category_desc', 'Verwalte Client-Zugriffsschlüssel für Mitspieler und Freunde auf deinem Server sowie Token für externe Dienste.')}
                    </Typography>
                </Box>
            </Box>

            {/* 1. Server API Keys Management (Friends, Clients, QR Code Share Links) */}
            <ServerAdminPanel />

            {/* 2. GitHub Personal Access Token */}
            <GitHubSettings />
        </Box>
    );
};
