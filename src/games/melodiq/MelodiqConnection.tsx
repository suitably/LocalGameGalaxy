import React from 'react';
import { DeviceConnection } from '../../components/connection/DeviceConnection';
import { useWebRTC } from './audio/WebRTCContext';
import { useClientRoles } from './hooks/useClientRoles';
import { useMelodiqSettings } from './hooks/SettingsContext';
import { useTranslation } from 'react-i18next';
import type { ClientRole } from './types';
import { Select, MenuItem, Box, Typography, Switch, FormControlLabel, Paper } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';

interface MelodiqConnectionProps {
    onBack: () => void;
}

export const MelodiqConnection: React.FC<MelodiqConnectionProps> = ({ onBack }) => {
    const { getRole, setRole } = useClientRoles();
    const { settings, updateSetting } = useMelodiqSettings();
    const { t } = useTranslation();

    return (
        <DeviceConnection
            onBack={onBack}
            title="Connect Phones"
            description="Connect your phone to use as a microphone. Scan the QR code below."
            gameId="melodiq"
            clientPath="/games/melodiq?role=client"
            WebRTCHostContextHook={useWebRTC}
            helperStorageKey="melodiq_helper_url"
            helperTokenKey="melodiq_helper_token"
            renderPeerExtra={(peer) => (
                <Select
                    size="small"
                    value={getRole(peer.deviceId || peer.peerId)}
                    onChange={(e) => {
                        setRole(peer.deviceId || peer.peerId, e.target.value as ClientRole);
                    }}
                    sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', height: 32, '& .MuiSelect-icon': { color: 'white' } }}
                >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="queue_manager">Queue Manager</MenuItem>
                    <MenuItem value="queue_contributor">Queue Contributor</MenuItem>
                    <MenuItem value="singer">Singer</MenuItem>
                </Select>
            )}
            extraOptions={
                <Paper
                    sx={{
                        p: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        width: '100%',
                        maxWidth: 500
                    }}
                >
                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.showScoreboardQrCode}
                                onChange={(e) => updateSetting('showScoreboardQrCode', e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box sx={{ ml: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <QrCode2Icon fontSize="small" sx={{ color: 'primary.main' }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {t('melodiq.settings_panel.show_scoreboard_qr', 'Show QR Code on Score Screen')}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {t('melodiq.settings_panel.show_scoreboard_qr_desc', 'Displays a QR code on the score overview screen so players can easily join or connect.')}
                                </Typography>
                            </Box>
                        }
                        sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                    />
                </Paper>
            }
        />
    );
};
