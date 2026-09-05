import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Tabs, Tab } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import DnsIcon from '@mui/icons-material/Dns';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import KeyIcon from '@mui/icons-material/Key';
import MicIcon from '@mui/icons-material/Mic';
import PersonIcon from '@mui/icons-material/Person';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
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

interface MelodiqSettingsCategoryProps {
    initialSubTab?: MelodiqSubTab;
    onNavigateToPlaylists?: () => void;
}

export type MelodiqSubTab = 'server' | 'microphones' | 'profiles' | 'gameplay' | 'playlists';
type ServerSubSection = 'connection' | 'setup' | 'apikeys';

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({ initialSubTab = 'server', onNavigateToPlaylists }) => {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState<MelodiqSubTab>(initialSubTab);
    const [serverSection, setServerSection] = useState<ServerSubSection>('connection');

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
            {/* Sub-Tabs Navigation for Melodiq */}
            <Paper sx={{ p: 0.5, borderRadius: 2.5, bgcolor: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Tabs
                    value={subTab}
                    onChange={(_, val) => setSubTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                        minHeight: 42,
                        '& .MuiTab-root': {
                            minHeight: 42,
                            py: 1,
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            borderRadius: 2,
                            gap: 1,
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                color: 'primary.main',
                                bgcolor: 'rgba(100, 180, 255, 0.1)',
                            },
                        },
                    }}
                >
                    <Tab 
                        icon={<DnsIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('melodiq.server.tab', 'Companion Server')} 
                        value="server" 
                    />
                    <Tab 
                        icon={<MicIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('melodiq.settings.microphones', 'Mikrofone')} 
                        value="microphones" 
                    />
                    <Tab 
                        icon={<PersonIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('melodiq.settings.profiles', 'Spieler-Profile')} 
                        value="profiles" 
                    />
                    <Tab 
                        icon={<SportsEsportsIcon fontSize="small" />} 
                        iconPosition="start" 
                        label={t('melodiq.settings.gameplay', 'Gameplay')} 
                        value="gameplay" 
                    />
                    {onNavigateToPlaylists && (
                        <Tab 
                            icon={<QueueMusicIcon fontSize="small" />} 
                            iconPosition="start" 
                            label={t('melodiq.playlists', 'Playlists')} 
                            value="playlists" 
                        />
                    )}
                </Tabs>
            </Paper>

            {/* Sub-Tab 0: Companion Server (Connection, Setup, API Keys) */}
            {subTab === 'server' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Secondary Navigation for Server */}
                    <Paper sx={{ p: 0.5, borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Tabs
                            value={serverSection}
                            onChange={(_, val) => setServerSection(val)}
                            variant="scrollable"
                            scrollButtons="auto"
                            textColor="primary"
                            indicatorColor="primary"
                            sx={{
                                minHeight: 38,
                                '& .MuiTab-root': {
                                    minHeight: 38,
                                    py: 0.8,
                                    px: 2,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    borderRadius: 1.5,
                                    gap: 0.8,
                                    color: 'text.secondary',
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                        bgcolor: 'rgba(100, 180, 255, 0.08)',
                                    },
                                },
                            }}
                        >
                            <Tab 
                                icon={<DnsIcon fontSize="small" />} 
                                iconPosition="start" 
                                label={t('melodiq.server.connection_tab', 'Verbindung & Status')} 
                                value="connection" 
                            />
                            <Tab 
                                icon={<AutoFixHighIcon fontSize="small" />} 
                                iconPosition="start" 
                                label={t('melodiq.server.setup_tab', 'Setup-Assistent')} 
                                value="setup" 
                            />
                            <Tab 
                                icon={<KeyIcon fontSize="small" />} 
                                iconPosition="start" 
                                label={t('melodiq.server.apikeys_tab', 'API-Schlüssel für Freunde')} 
                                value="apikeys" 
                            />
                        </Tabs>
                    </Paper>

                    {/* Server Section Content */}
                    {serverSection === 'connection' && <ServerConnection />}
                    {serverSection === 'setup' && <ServerSetupWizard />}
                    {serverSection === 'apikeys' && <ServerAdminPanel />}
                </Box>
            )}

            {/* Sub-Tab 1: Microphones */}
            {subTab === 'microphones' && (
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
                    <HardwareMicSetup />
                </Paper>
            )}

            {/* Sub-Tab 2: Profiles */}
            {subTab === 'profiles' && (
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                <Paper sx={{ p: { xs: 2.5, sm: 3, md: 4 }, borderRadius: 3, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 6 }}>
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
