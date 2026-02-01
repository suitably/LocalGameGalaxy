import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Container, Paper, Divider, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';

import { MicrophoneManager } from './audio/MicrophoneManager';
import { useProfiles } from './hooks/useProfiles';
import { useSettings, DEFAULT_SETTINGS, type SettingsState } from './hooks/useSettings';
import { SessionSetup } from './components/SessionSetup';
import { UserProfilesManager } from './components/UserProfilesManager';
import { GameSettingsPanel } from './components/GameSettingsPanel';
import { LibraryManager } from './components/LibraryManager';
import type { UserProfile, ActivePlayer } from './types';

// Re-export types for backwards compatibility
export type { UserProfile, ActivePlayer } from './types';

interface MelodiqSettingsProps {
    onBack: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();

    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // Custom Hooks for state management
    const profilesHook = useProfiles(devices);
    const settingsHook = useSettings();

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
        <Container maxWidth="md" sx={{ py: 4, height: '100%', overflowY: 'auto' }}>
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

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* 1. Library Management (Hybrid) */}
                <LibraryManager />

                <Divider />

                {/* 2. Session Setup */}
                <SessionSetup
                    profiles={profilesHook.profiles}
                    activePlayers={profilesHook.activePlayers}
                    devices={devices}
                    loadingDevices={loadingDevices}
                    onRefreshDevices={refreshDevices}
                    onToggleActivePlayer={profilesHook.toggleActivePlayer}
                    onMoveActivePlayer={profilesHook.moveActivePlayer}
                    onUpdateActivePlayerConfig={profilesHook.updateActivePlayerConfig}
                />

                <Divider />

                {/* 3. User Profiles */}
                <UserProfilesManager
                    profiles={profilesHook.profiles}
                    onAddProfile={profilesHook.addProfile}
                    onUpdateProfile={profilesHook.updateProfile}
                    onDeleteProfile={profilesHook.deleteProfile}
                />

                <Divider />

                {/* 4. Game Settings */}
                <GameSettingsPanel
                    settings={settingsHook.settings}
                    onUpdateSetting={settingsHook.updateSetting}
                />

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<UndoIcon />}
                            onClick={handleUndo}
                        >
                            Undo Session
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            startIcon={<RestoreIcon />}
                            onClick={handleResetDefaults}
                        >
                            Reset Defaults
                        </Button>
                    </Box>
                    <Button variant="contained" onClick={onBack}>Back</Button>
                </Box>
            </Paper>
        </Container>
    );
};
