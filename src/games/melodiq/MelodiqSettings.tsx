import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Divider, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';

import { MicrophoneManager } from './audio/MicrophoneManager';
import { useProfiles } from './hooks/useProfiles';
import { useMelodiqSettings, DEFAULT_SETTINGS, type SettingsState } from './hooks/SettingsContext';
import { HardwareMicSetup } from './components/HardwareMicSetup';
import { UserProfilesManager } from './components/UserProfilesManager';
import { GameSettingsPanel } from './components/GameSettingsPanel';
import { HelperConnection } from './components/HelperConnection';

import type { UserProfile, ActivePlayer } from './types';

// Re-export types for backwards compatibility
export type { UserProfile, ActivePlayer } from './types';

interface MelodiqSettingsProps {
    onBack: () => void;
    onNavigateToPlaylists?: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack, onNavigateToPlaylists }) => {
    const { t, i18n } = useTranslation();

    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

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

    // Device Refresh Logic
    const refreshDevices = async () => {
        setLoadingDevices(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devs = await MicrophoneManager.getDevices();
            setDevices(devs);
            setLoadingDevices(false);
            stream.getTracks().forEach(t => t.stop());
        } catch (err) {
            console.error('Failed to get permissions:', err);
            setLoadingDevices(false);
        }
    };

    // Initialize: Load Devices
    useEffect(() => {
        MicrophoneManager.getDevices().then(devs => {
            setDevices(devs);
            setLoadingDevices(false);
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
        <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={onBack} color="primary">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    {t('settings.title', 'Settings')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    Changes saved automatically
                </Typography>
            </Box>

            <Paper sx={{ p: { xs: 2, md: 4 }, display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                <Divider />



                {/* 3. User Profiles */}
                <UserProfilesManager
                    profiles={profilesHook.profiles}
                    onAddProfile={profilesHook.addProfile}
                    onUpdateProfile={profilesHook.updateProfile}
                    onDeleteProfile={profilesHook.deleteProfile}
                />

                <Divider />

                {/* 4. Language Settings */}
                <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>{t('settings.language', 'Language')}</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant={i18n.language === 'en' ? 'contained' : 'outlined'}
                            onClick={() => i18n.changeLanguage('en')}
                        >
                            English
                        </Button>
                        <Button
                            variant={i18n.language === 'de' ? 'contained' : 'outlined'}
                            onClick={() => i18n.changeLanguage('de')}
                        >
                            Deutsch
                        </Button>
                    </Box>
                </Box>

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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 2, sm: 1 },
                        width: { xs: '100%', sm: 'auto' }
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
                    <Button
                        variant="contained"
                        onClick={onBack}
                        sx={{
                            width: { xs: '100%', sm: 'auto' },
                            borderRadius: 50,
                            px: 6,
                            py: 1.5,
                            fontSize: '1.1rem',
                            backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                            color: 'white'
                        }}
                    >
                        Back
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};
