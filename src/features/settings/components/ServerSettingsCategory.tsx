import React from 'react';
import { Box, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import { useTranslation } from 'react-i18next';
import { SignalingSettingsCard } from './server/SignalingSettingsCard';
import { CompanionPluginsSection } from './server/CompanionPluginsSection';
import { ComposeGeneratorPanel } from './server/ComposeGeneratorPanel';

interface ServerSettingsCategoryProps {
    autoFocusUsdb?: boolean;
    onBackToGame?: () => void;
}

export const ServerSettingsCategory: React.FC<ServerSettingsCategoryProps> = ({
    autoFocusUsdb,
    onBackToGame,
}) => {
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header / Intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DnsIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {t('settings.server_title', 'Server & Konnektivität')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t(
                            'settings.server_desc',
                            'Zentrales WebRTC-Signaling für alle Party Games sowie modulare Companion-Server (z. B. MelodiQ Audio-KI).',
                        )}
                    </Typography>
                </Box>
            </Box>

            {/* 1. Platform Infrastructure: WebRTC Signaling */}
            <SignalingSettingsCard />

            {/* 2. Modular Game Companion Plugins */}
            <CompanionPluginsSection
                autoFocusUsdb={autoFocusUsdb}
                onBackToGame={onBackToGame}
            />

            {/* 3. Docker Compose Generator */}
            <ComposeGeneratorPanel />
        </Box>
    );
};
