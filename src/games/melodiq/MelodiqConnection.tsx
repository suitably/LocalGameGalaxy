import React from 'react';
import { DeviceConnection } from '../../components/connection/DeviceConnection';
import { useWebRTC } from './audio/WebRTCContext';
import { useClientRoles } from './hooks/useClientRoles';
import { useMelodiqSettings } from './hooks/SettingsContext';
import { useSongs } from './hooks/useSongs';
import { useTranslation } from 'react-i18next';
import type { ClientRole } from './types';
import { Select, MenuItem, Box, Typography, Switch, FormControlLabel, Paper, Button } from '@mui/material';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface MelodiqConnectionProps {
    onBack: () => void;
}

export const MelodiqConnection: React.FC<MelodiqConnectionProps> = ({ onBack }) => {
    const { getRole, setRole } = useClientRoles();
    const { settings, updateSetting } = useMelodiqSettings();
    const { localLibrary } = useSongs();
    const { t } = useTranslation();
    const webrtcData = useWebRTC();

    return (
        <DeviceConnection
            onBack={onBack}
            title="Connect Phones"
            description="Connect your phone to use as a microphone. Scan the QR code below."
            gameId="melodiq"
            clientPath="/games/melodiq?role=client"
            webrtcData={webrtcData}
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
                <Box sx={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {localLibrary.isSupported && (
                        <Paper
                            sx={{
                                p: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 2
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FolderOpenIcon fontSize="small" color="primary" />
                                    {t('melodiq.lite_mode', 'Lite-Modus')}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={localLibrary.selectFolder}
                                >
                                    {localLibrary.hasFolder
                                        ? t('melodiq.change_local_folder', 'Ordner wechseln')
                                        : t('melodiq.open_local_folder', 'Lokalen Ordner öffnen')}
                                </Button>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                {localLibrary.hasFolder
                                    ? `${localLibrary.folderName} (${localLibrary.localSongs.length} Songs)`
                                    : t('melodiq.local_folder_desc', 'Lade UltraStar-Songs direkt aus einem lokalen Ordner – komplett ohne Server.')}
                            </Typography>
                        </Paper>
                    )}

                    <Paper
                        sx={{
                            p: 2,
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 2
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
                </Box>
            }
        />
    );
};

