import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Divider, Chip } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import DnsIcon from '@mui/icons-material/Dns';
import { useTranslation } from 'react-i18next';
import { storage } from '../../../lib/storage';
import {
    MicrophoneManager,
    useProfiles,
    useMelodiqSettings,
    DEFAULT_SETTINGS,
    type SettingsState,
    HardwareMicSetup,
    UserProfilesManager,
    GameSettingsPanel,
    type UserProfile,
    type ActivePlayer,
    initMelodiqI18n,
} from '../../../games/melodiq';

interface MelodiqSettingsCategoryProps {
    onNavigateToPlaylists?: () => void;
    onNavigateToServer?: () => void;
}

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({ onNavigateToPlaylists, onNavigateToServer }) => {
    const { t } = useTranslation();

    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    // Server State
    const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
    const [serverUrl, setServerUrl] = useState(() => storage.getHelperUrl());

    useEffect(() => {
        const updateServer = () => {
            setIsServerActive(storage.isHelperActive());
            setServerUrl(storage.getHelperUrl());
        };
        window.addEventListener('server_connection_updated', updateServer);
        return () => window.removeEventListener('server_connection_updated', updateServer);
    }, []);

    // Custom Hooks for state management
    const profilesHook = useProfiles(devices);
    const settingsHook = useMelodiqSettings();

    // Snapshot initial state for session undo (only captured once on mount)
    const initialSnapshot = useRef<{
        settings: SettingsState;
        profiles: UserProfile[];
        activePlayers: ActivePlayer[];
    } | null>(null);

    useEffect(() => {
        initMelodiqI18n();
        // Capture once on mount
        if (!initialSnapshot.current) {
            initialSnapshot.current = {
                settings: { ...settingsHook.settings },
                profiles: [...profilesHook.profiles],
                activePlayers: [...profilesHook.activePlayers]
            };
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize: Load Devices
    useEffect(() => {
        MicrophoneManager.getDevices().then(devs => {
            setDevices(devs);
        });
    }, []);

    // Undo: Restore to session start state
    const handleUndo = () => {
        if (initialSnapshot.current) {
            settingsHook.resetSettings(initialSnapshot.current.settings);
            profilesHook.resetProfiles(
                initialSnapshot.current.profiles,
                initialSnapshot.current.activePlayers
            );
        }
    };

    // Reset to Factory Defaults
    const handleResetDefaults = () => {
        if (confirm('Reset all game settings to factory defaults? Profiles will not be affected.')) {
            settingsHook.resetSettings(DEFAULT_SETTINGS);
        }
    };

    return (
        <Paper sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
            {/* Companion Server Status Banner */}
            <Paper sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <DnsIcon color="primary" />
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                    {t('melodiq.server.title', 'Melodiq Companion Server')}
                                </Typography>
                                {isServerActive ? (
                                    <Chip label={t('common.connected', 'Aktiv')} size="small" color="success" variant="outlined" />
                                ) : (
                                    <Chip label={t('common.disconnected', 'Inaktiv')} size="small" color="default" variant="outlined" />
                                )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {isServerActive 
                                    ? t('melodiq.server.active_desc', `Server ist aktiv auf ${serverUrl}`)
                                    : t('melodiq.server.inactive_desc', 'Streaming, YouTube-Downloads und Gesangstrennung erfordern den Begleit-Server.')}
                            </Typography>
                        </Box>
                    </Box>
                    {onNavigateToServer && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onNavigateToServer}
                            sx={{ borderRadius: 50, textTransform: 'none' }}
                        >
                            {isServerActive ? t('melodiq.server.manage', 'Server verwalten') : t('melodiq.server.setup', 'Server einrichten')}
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* 1. Playlists Management Link */}
            {onNavigateToPlaylists && (
                <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>{t('melodiq.playlists', 'Playlists')}</Typography>
                    <Button variant="outlined" onClick={onNavigateToPlaylists}>
                        {t('melodiq.manage_playlists', 'Manage Playlists')}
                    </Button>
                </Box>
            )}
            {/* 2. Hardware Microphones */}
            <HardwareMicSetup />

            <Divider />

            {/* 3. User Profiles */}
            <UserProfilesManager
                profiles={profilesHook.profiles}
                onAddProfile={profilesHook.addProfile}
                onUpdateProfile={profilesHook.updateProfile}
                onDeleteProfile={profilesHook.deleteProfile}
            />

            <Divider />

            {/* 5. Game Settings */}
            <GameSettingsPanel
                settings={settingsHook.settings}
                onUpdateSetting={settingsHook.updateSetting}
            />

            <Box sx={{
                mt: 4,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 2
            }}>
                <Button
                    variant="outlined"
                    startIcon={<UndoIcon />}
                    onClick={handleUndo}
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        borderRadius: 50,
                        px: 4,
                        py: 1.5,
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: 'white',
                            bgcolor: 'rgba(255,255,255,0.05)'
                        }
                    }}
                >
                    Undo Session
                </Button>
                <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<RestoreIcon />}
                    onClick={handleResetDefaults}
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        borderRadius: 50,
                        px: 4,
                        py: 1.5
                    }}
                >
                    Reset Defaults
                </Button>
            </Box>
        </Paper>
    );
};
