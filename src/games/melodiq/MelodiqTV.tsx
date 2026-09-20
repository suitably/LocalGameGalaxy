import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import GamepadIcon from '@mui/icons-material/Gamepad';
import { MelodiqSession } from './gameplay/MelodiqSession';
import { WebRTCMockProvider } from './audio/WebRTCContext';
import { QueueProvider } from './hooks/useQueue';
import { ScoreBoardQrCode } from './gameplay/ScoreBoardQrCode';
import { useTranslation } from 'react-i18next';
import { initMelodiqI18n } from './i18n';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useScreenOrientation } from '../../hooks/useScreenOrientation';
import { useTVReceiver } from './hooks/useTVReceiver';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initMelodiqI18n();

export const MelodiqTV: React.FC = () => {
    const { t } = useTranslation();
    useWakeLock(true);
    useScreenOrientation('landscape');

    const {
        activeSong,
        setActiveSong,
        passiveState,
        isConnected,
        downloadingSong,
        sessionInfo
    } = useTVReceiver();

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
                <WebRTCMockProvider partyId={sessionInfo.partyId} activeTrackerUrls={sessionInfo.activeTrackerUrls}>
                    <Box sx={{ width: '100vw', height: '100vh', bgcolor: 'black', overflow: 'hidden' }}>
                        <MelodiqSession
                            key={activeSong.id}
                            song={activeSong}
                            initialTime={activeSong.initialTime || 0}
                            isTVMode={true}
                            isPassive={true}
                            passiveState={passiveState}
                            onExit={() => setActiveSong(null)}
                            muteAudio={false}
                            uiScale={2.0}
                        />
                    </Box>
                </WebRTCMockProvider>
            </QueueProvider>
        );
    }

    return (
        <WebRTCMockProvider partyId={sessionInfo.partyId} activeTrackerUrls={sessionInfo.activeTrackerUrls}>
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
        </WebRTCMockProvider>
    );
};
