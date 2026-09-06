import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import { useTranslation } from 'react-i18next';
import { ServerConnection } from '../../../components/connection/ServerConnection';
import { ServerAdminPanel } from '../../../components/connection/ServerAdminPanel';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
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
    onNavigateToPlaylists?: () => void;
}

export type MelodiqSubTab = 'all' | 'server' | 'microphones' | 'profiles' | 'gameplay' | 'playlists';

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({
    activeSubTab,
    initialSubTab = 'all',
    onNavigateToPlaylists
}) => {
    const { t } = useTranslation();
    const subTab = activeSubTab || initialSubTab;

    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

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

    // Reset to Factory Defaults with accessible ConfirmDialog
    const handleResetDefaults = () => {
        setResetDialogOpen(true);
    };

    const executeResetDefaults = () => {
        settingsHook.resetSettings(DEFAULT_SETTINGS);
        setResetDialogOpen(false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Sub-Tab 0: Companion Server (Connection, Setup Dialog, API Keys) */}
            {(subTab === 'all' || subTab === 'server') && (
                <Box id="settings-section-server" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box id="settings-section-server-connection">
                        <ServerConnection />
                    </Box>
                    <Box id="settings-section-admin">
                        <ServerAdminPanel />
                    </Box>
                </Box>
            )}

            {/* Sub-Tab 1: Microphones */}
            {(subTab === 'all' || subTab === 'microphones') && (
                <Paper id="settings-section-microphones" sx={settingsCardSx}>
                    <HardwareMicSetup />
                </Paper>
            )}

            {/* Sub-Tab 2: Profiles */}
            {(subTab === 'all' || subTab === 'profiles') && (
                <Paper id="settings-section-profiles" sx={settingsCardSx}>
                    <UserProfilesManager
                        profiles={profilesHook.profiles}
                        onAddProfile={profilesHook.addProfile}
                        onUpdateProfile={profilesHook.updateProfile}
                        onDeleteProfile={profilesHook.deleteProfile}
                    />
                </Paper>
            )}

            {/* Sub-Tab 3: Gameplay */}
            {(subTab === 'all' || subTab === 'gameplay') && (
                <Paper id="settings-section-gameplay" sx={{ ...settingsCardSx, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
            {(subTab === 'all' || subTab === 'playlists') && onNavigateToPlaylists && (
                <Paper id="settings-section-playlists" sx={settingsCardSx}>
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

            <ConfirmDialog
                open={resetDialogOpen}
                title={t('common.confirm', 'Bestätigen')}
                message={t('melodiq.settings.reset_confirm', 'Alle Spieleinstellungen auf Standardwerte zurücksetzen? Profile bleiben unberührt.')}
                confirmText={t('common.reset', 'Zurücksetzen')}
                cancelText={t('common.cancel', 'Abbrechen')}
                confirmColor="warning"
                onConfirm={executeResetDefaults}
                onCancel={() => setResetDialogOpen(false)}
            />
        </Box>
    );
};
