import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Divider } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';

import { MicrophoneManager } from '../../../games/melodiq/audio/MicrophoneManager';
import { useProfiles } from '../../../games/melodiq/hooks/useProfiles';
import { useMelodiqSettings, DEFAULT_SETTINGS, type SettingsState } from '../../../games/melodiq/hooks/SettingsContext';
import { HardwareMicSetup } from '../../../games/melodiq/components/HardwareMicSetup';
import { UserProfilesManager } from '../../../games/melodiq/components/UserProfilesManager';
import { GameSettingsPanel } from '../../../games/melodiq/components/GameSettingsPanel';
import { HelperConnection } from '../../../games/melodiq/components/HelperConnection';
import type { UserProfile, ActivePlayer } from '../../../games/melodiq/types';
import { initMelodiqI18n } from '../../../games/melodiq/i18n';

interface MelodiqSettingsCategoryProps {
    onNavigateToPlaylists?: () => void;
}

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({ onNavigateToPlaylists }) => {
    initMelodiqI18n();
    const { t } = useTranslation();

    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

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
            {/* 0. P2P Helper Connection (Priority for TV) */}
            <HelperConnection />

            <Divider />

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
