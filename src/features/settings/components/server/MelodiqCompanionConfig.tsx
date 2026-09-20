import React from 'react';
import { Box } from '@mui/material';
import { ServerConnection } from '../../../../components/connection/ServerConnection';
import { ServerAdminPanel } from '../../../../components/connection/ServerAdminPanel';
import { ServerDirectoryManager } from '../../../../components/connection/ServerDirectoryManager';
import { ServerPreferences } from '../../../../components/connection/ServerPreferences';
import { ServerUsdbConfig } from '../../../../components/connection/ServerUsdbConfig';

interface MelodiqCompanionConfigProps {
    autoFocusUsdb?: boolean;
    onBackToGame?: () => void;
}

export const MelodiqCompanionConfig: React.FC<MelodiqCompanionConfigProps> = ({
    autoFocusUsdb,
    onBackToGame,
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box id="settings-section-server-connection">
                <ServerConnection />
            </Box>
            <Box id="settings-section-directories">
                <ServerDirectoryManager />
            </Box>
            <Box id="settings-section-preferences">
                <ServerPreferences />
            </Box>
            <Box id="settings-section-usdb">
                <ServerUsdbConfig autoFocusUsdb={autoFocusUsdb} onBackToGame={onBackToGame} />
            </Box>
            <Box id="settings-section-admin">
                <ServerAdminPanel />
            </Box>
        </Box>
    );
};
