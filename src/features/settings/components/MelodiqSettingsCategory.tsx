import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { useTranslation } from 'react-i18next';
import { ServerConnection } from '../../../components/connection/ServerConnection';
import { ServerSetupWizard } from '../../../components/connection/ServerSetupWizard';
import { ServerAdminPanel } from '../../../components/connection/ServerAdminPanel';
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
import { settingsCardSx } from '../settingsStyles';

interface MelodiqSettingsCategoryProps {
    activeSubTab?: MelodiqSubTab;
    initialSubTab?: MelodiqSubTab;
    activeServerSection?: ServerSubSection;
    onNavigateToPlaylists?: () => void;
}

export type MelodiqSubTab = 'server' | 'microphones' | 'profiles' | 'gameplay' | 'playlists';
export type ServerSubSection = 'connection' | 'setup' | 'apikeys';

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({
    activeSubTab,
    initialSubTab = 'server',
    activeServerSection,
    onNavigateToPlaylists
}) => {
    const { t } = useTranslation();
    const subTab = activeSubTab || initialSubTab;
    const serverSection = activeServerSection || 'connection';

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Sub-Tab 0: Companion Server (Connection, Setup, API Keys) */}
            {subTab === 'server' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Server Section Content - navigation controlled via GlobalHeader */}
                    {serverSection === 'connection' && <ServerConnection />}
                    {serverSection === 'setup' && <ServerSetupWizard />}
                    {serverSection === 'apikeys' && <ServerAdminPanel />}
                </Box>
            )}

            {/* Sub-Tab 1: Microphones */}
            {subTab === 'microphones' && (
                <Paper sx={settingsCardSx}>
                    <HardwareMicSetup />
                </Paper>
            )}

            {/* Sub-Tab 2: Profiles */}
            {subTab === 'profiles' && (
                <Paper sx={settingsCardSx}>
                    <UserProfilesManager
                        profiles={profilesHook.profiles}
                        onAddProfile={profilesHook.addProfile}
                        onUpdateProfile={profilesHook.updateProfile}
                        onDeleteProfile={profilesHook.deleteProfile}
                    />
                </Paper>
            )}

            {/* Sub-Tab 3: Gameplay */}
            {subTab === 'gameplay' && (
                <Paper sx={{ ...settingsCardSx, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <GameSettingsPanel
                        settings={settingsHook.settings}
                        onUpdateSetting={settingsHook.updateSetting}
                    />

                    <Box sx={{
                        mt: 2,
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
            )}

            {/* Sub-Tab 4: Playlists */}
            {subTab === 'playlists' && onNavigateToPlaylists && (
                <Paper sx={settingsCardSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <QueueMusicIcon color="primary" />
                        <Typography variant="h6">{t('melodiq.playlists', 'Playlists')}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {t('melodiq.playlists_desc', 'Verwalte deine Song-Playlists, Favoriten und benutzerdefinierten Zusammenstellungen.')}
                    </Typography>
                    <Button variant="contained" color="primary" onClick={onNavigateToPlaylists} sx={{ borderRadius: 2 }}>
                        {t('melodiq.manage_playlists', 'Manage Playlists')}
                    </Button>
                </Paper>
            )}
        </Box>
    );
};
