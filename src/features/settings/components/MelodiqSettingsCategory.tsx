import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Chip, Tabs, Tab } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import DnsIcon from '@mui/icons-material/Dns';
import MicIcon from '@mui/icons-material/Mic';
import PersonIcon from '@mui/icons-material/Person';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
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

type MelodiqSubTab = 'microphones' | 'profiles' | 'gameplay' | 'playlists';

export const MelodiqSettingsCategory: React.FC<MelodiqSettingsCategoryProps> = ({ onNavigateToPlaylists, onNavigateToServer }) => {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState<MelodiqSubTab>('microphones');

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Companion Server Status Banner */}
            <Paper sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'rgba(30, 30, 40, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 4 }}>
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

            {/* Sub-Tabs Navigation */}
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
