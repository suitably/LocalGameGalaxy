import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Container, Paper, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { MicrophoneManager } from './audio/MicrophoneManager';
import { useProfiles } from './hooks/useProfiles';
import { useSettings } from './hooks/useSettings';
import { LibraryManager } from './components/LibraryManager';
import { SessionSetup } from './components/SessionSetup';
import { UserProfilesManager } from './components/UserProfilesManager';
import { GameSettingsPanel } from './components/GameSettingsPanel';

// Re-export types for backwards compatibility
export type { UserProfile, ActivePlayer } from './types';

interface MelodiqSettingsProps {
    onBack: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack }) => {
    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // Custom Hooks for state management
    const profilesHook = useProfiles(devices);
    const settingsHook = useSettings();

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

    // Save Logic
    const handleSave = () => {
        profilesHook.saveProfiles();
        settingsHook.saveSettings();
        onBack();
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
                <Typography variant="h4">Settings</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* 1. Song Libraries */}
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

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="large" onClick={handleSave}>Save & Back</Button>
                </Box>
            </Paper>
        </Container>
    );
};
