import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import GamepadIcon from '@mui/icons-material/Gamepad';
import { MelodiqSession } from './gameplay/MelodiqSession';
import { type PassiveGameState } from './types';
import { WebRTCHostContext, type WebRTCHostContextType } from '../../lib/webrtc';
import { QueueProvider } from './hooks/useQueue';
import { useMelodiqSettings } from './hooks/SettingsContext';
import { ScoreBoardQrCode } from './gameplay/ScoreBoardQrCode';

import { useTranslation } from 'react-i18next';
import { initMelodiqI18n } from './i18n';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useScreenOrientation } from '../../hooks/useScreenOrientation';

const MockWebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const mockContext: WebRTCHostContextType<any, any> = {
        manager: null,
        peers: [],
        activePeers: [],
        inactivePeers: [],
        togglePeerActive: () => { },
        partyId: 'TV-MODE',
        regeneratePartyId: () => { },
        trackerUrls: [],
        activeTrackerUrls: [],
        disabledTrackerUrls: [],
        allTrackers: [],
        toggleTrackerActive: () => { },
        addTrackerUrl: () => { },
        removeTrackerUrl: () => { },
        restoreDefaultTrackers: () => { },
    };

    return (
        <WebRTCHostContext.Provider value={mockContext}>
            {children}
        </WebRTCHostContext.Provider>
    );
};

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initMelodiqI18n();

export const MelodiqTV: React.FC = () => {
    const { t } = useTranslation();
    const { updateSetting } = useMelodiqSettings();

    useWakeLock(true);
    useScreenOrientation('landscape');

    const [activeSong, setActiveSong] = useState<any | null>(null);
    const [passiveState, setPassiveState] = useState<PassiveGameState | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [downloadingSong, setDownloadingSong] = useState<{title: string, artist: string} | null>(null);

    useEffect(() => {
        const channel = new BroadcastChannel('melodiq_tv_control');

        const handleMessage = (type: string, payload: any) => {
            if (type === 'PLAY_SONG') {
                if (payload.songData) {
                    setDownloadingSong(null);
                    setActiveSong((prev: any) => {
                        if (prev && prev.id === payload.songData.id && payload.currentTime === undefined) {
                            return prev;
                        }
                        return {
                            ...payload.songData,
                            initialTime: payload.currentTime || 0
                        };
                    });
                } else {
                    console.warn('[MelodiqTV] PLAY_SONG received without songData, ignoring.');
                }
            } else if (type === 'STOP_SONG') {
                setDownloadingSong(null);
                setActiveSong(null);
                setPassiveState(null);
            } else if (type === 'REMOTE_COMMAND' && payload.command === 'WAIT_FOR_DOWNLOAD') {
                setActiveSong(null);
                setDownloadingSong({ title: payload.value.title, artist: payload.value.artist });
            } else if (type === 'SETTINGS_UPDATE') {
                if (payload) {
                    Object.entries(payload).forEach(([k, v]) => {
                        updateSetting(k as any, v as any);
                    });
                }
            } else if (type === 'GAME_STATE') {
                setPassiveState(payload);
                window.dispatchEvent(new CustomEvent('melodiq_tv_game_state', { detail: payload }));
            } else if (type === 'PING') {
                channel.postMessage({ type: 'PONG' });
            }
        };

        channel.onmessage = (e) => handleMessage(e.data.type, e.data.payload);
        channel.postMessage({ type: 'TV_READY' });

        // Presentation API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        if (nav.presentation?.receiver) {
            nav.presentation.receiver.connectionList.then((list: any) => {
                list.connections.forEach((conn: any) => setupConnection(conn));
                list.onconnectionavailable = (evt: any) => setupConnection(evt.connection);
            });
        }

        function setupConnection(connection: any) {
            setIsConnected(true);
            connection.onmessage = (event: any) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data.type, data.payload);
                } catch (e) { console.error('Failed to parse presentation msg', e); }
            };
            connection.send(JSON.stringify({ type: 'TV_READY' }));
        }

        return () => channel.close();
    }, []);

    if (downloadingSong) {
        return (
            <Box sx={{
                width: '100vw',
                height: '100vh',
                bgcolor: '#121212',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
            }}>
                <CircularProgress size={100} thickness={4} sx={{ color: '#FE6B8B' }} />
                <Typography variant="h3" fontWeight="bold">
                    {t('melodiq.waiting_for_download')}
                </Typography>
                <Typography variant="h4" color="text.secondary">
                    {downloadingSong.artist} - {downloadingSong.title}
                </Typography>
            </Box>
        );
    }

    if (activeSong) {
        return (
            <QueueProvider>
                <MockWebRTCProvider>
                    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'black', overflow: 'hidden' }}>
                        <MelodiqSession
                            key={activeSong.id}
                            song={activeSong}
                            initialTime={activeSong.initialTime || 0}
                            isTVMode={true}
                            isPassive={true}
                            passiveState={passiveState}
                            onExit={() => setActiveSong(null)}
                            // We don't mute audio on TV, it should play!
                            muteAudio={false}
                            uiScale={2.0}
                        />
                    </Box>
                </MockWebRTCProvider>
            </QueueProvider>
        );
    }

    return (
        <MockWebRTCProvider>
            <Box sx={{
                width: '100vw',
                height: '100vh',
                bgcolor: '#121212',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                p: 3
            }}>
                <GamepadIcon sx={{ fontSize: 80, color: isConnected ? '#4CAF50' : '#757575' }} />
                <Typography variant="h2" fontWeight="bold" sx={{
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Melodiq TV
                </Typography>
                <Typography variant="h5" color="text.secondary">
                    {isConnected ? 'Connected to Controller' : 'Waiting for Controller...'}
                </Typography>
                
                <ScoreBoardQrCode sx={{ maxWidth: 450, width: '100%', mt: 1 }} />

                {!isConnected && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                            Stuck? Try reloading this page or the host.
                        </Typography>
                    </Box>
                )}
            </Box>
        </MockWebRTCProvider>
    );
};
