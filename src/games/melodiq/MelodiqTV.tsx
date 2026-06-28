import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import GamepadIcon from '@mui/icons-material/Gamepad';
import { MelodiqSession, type PassiveGameState } from './gameplay/MelodiqSession';
import { SettingsProvider } from './hooks/SettingsContext';
import { WebRTCHostContext, type WebRTCHostContextType } from '../../lib/webrtc/WebRTCHostContext';

import { initMelodiqI18n } from './i18n';

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

export const MelodiqTV: React.FC = () => {
    initMelodiqI18n();
    const [activeSong, setActiveSong] = useState<any | null>(null);
    const [passiveState, setPassiveState] = useState<PassiveGameState | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const channel = new BroadcastChannel('melodiq_tv_control');

        const handleMessage = (type: string, payload: any) => {
            if (type === 'PLAY_SONG') {
                if (payload.songData) {
                    setActiveSong(payload.songData);
                } else {
                    console.warn('[MelodiqTV] PLAY_SONG received without songData, ignoring.');
                }
            } else if (type === 'STOP_SONG') {
                setActiveSong(null);
                setPassiveState(null);
            } else if (type === 'GAME_STATE') {
                setPassiveState(payload);
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

    if (activeSong) {
        return (
            <SettingsProvider>
                <MockWebRTCProvider>
                    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'black', overflow: 'hidden' }}>
                        <MelodiqSession
                            key={activeSong.id}
                            song={activeSong}
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
            </SettingsProvider>
        );
    }

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
            gap: 3
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
            {!isConnected && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
                        Stuck? Try reloading this page or the host.
                    </Typography>
                </Box>
            )}
        </Box>
    );
};
