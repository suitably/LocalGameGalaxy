import React from 'react';
import { Box } from '@mui/material';
import { SignalingSettingsCard } from './server/SignalingSettingsCard';
import { CompanionPluginsSection } from './server/CompanionPluginsSection';
import { ServerSetupCard } from './server/ServerSetupCard';
import { ServerPairingCard } from './server/ServerPairingCard';

interface ServerSettingsCategoryProps {
  autoFocusUsdb?: boolean;
}

/** Connectivity page: pairing link, signaling, companion plugins, server setup. */
export const ServerSettingsCategory: React.FC<ServerSettingsCategoryProps> = ({
  autoFocusUsdb,
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {/* Opened via the server's one-time pairing link */}
    <ServerPairingCard />
    <SignalingSettingsCard />
    <Box id="settings-section-companion" tabIndex={-1}>
      <CompanionPluginsSection autoFocusUsdb={autoFocusUsdb} />
    </Box>
    <ServerSetupCard />
  </Box>
);
