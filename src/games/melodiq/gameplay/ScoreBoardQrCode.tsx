import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Chip, type SxProps, type Theme } from '@mui/material';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import { useWebRTC } from '../audio/WebRTCContext';
import { buildDeviceConnectionUrl } from '../../../components/connection/connectionUrl';

interface ScoreBoardQrCodeProps {
    sx?: SxProps<Theme>;
    compact?: boolean;
}

export const ScoreBoardQrCode: React.FC<ScoreBoardQrCodeProps> = ({ sx, compact = false }) => {
    const { t } = useTranslation();
    const { settings } = useMelodiqSettings();
    const { partyId: webrtcPartyId, activeTrackerUrls = [] } = useWebRTC();
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    const partyId = (webrtcPartyId && webrtcPartyId !== 'TV-MODE')
        ? webrtcPartyId
        : (localStorage.getItem('melodiq_party_id') || webrtcPartyId || '');

    useEffect(() => {
        if (!settings.showScoreboardQrCode || !partyId) return;

        const baseUrl = localStorage.getItem('melodiq_host_base_url') || window.location.origin;
        const trackers = activeTrackerUrls.length > 0
            ? activeTrackerUrls
            : (() => {
                try {
                    return JSON.parse(localStorage.getItem('melodiq_tracker_urls') || '[]');
                } catch {
                    return [];
                }
            })();

        const url = buildDeviceConnectionUrl({
            baseUrl,
            clientPath: '/games/melodiq?role=client',
            partyId,
            trackerUrls: trackers
        });

        QRCode.toDataURL(url, { width: 250, margin: 1 })
            .then(dataUrl => setQrDataUrl(dataUrl))
            .catch(err => console.error('[ScoreBoardQrCode] Failed to generate QR code:', err));
    }, [settings.showScoreboardQrCode, partyId, activeTrackerUrls]);

    if (!settings.showScoreboardQrCode || !partyId) {
        return null;
    }

    const qrSize = compact ? 80 : 96;

    return (
        <Paper
            elevation={3}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: 3,
                bgcolor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                flexShrink: 0,
                ...sx
            }}
        >
            {/* QR Code Container */}
            <Box
                sx={{
                    p: 0.75,
                    bgcolor: 'white',
                    borderRadius: 2,
                    boxShadow: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: qrSize + 12,
                    height: qrSize + 12
                }}
            >
                {qrDataUrl ? (
                    <img
                        src={qrDataUrl}
                        alt="Join Session QR Code"
                        style={{
                            display: 'block',
                            width: qrSize,
                            height: qrSize,
                            borderRadius: 4
                        }}
                    />
                ) : (
                    <Box sx={{ width: qrSize, height: qrSize, bgcolor: '#eee', borderRadius: 1 }} />
                )}
            </Box>

            {/* Information Block */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="subtitle1"
                    sx={{
                        fontWeight: 'bold',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        lineHeight: 1.2,
                        mb: 0.5
                    }}
                >
                    📱 {t('melodiq.join_session', 'Join Session')}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 1,
                        lineHeight: 1.25
                    }}
                >
                    {t('melodiq.scan_to_join_desc', 'Scan the QR code to connect your phone as a microphone or controller')}
                </Typography>
                {partyId && (
                    <Chip
                        label={t('melodiq.party_id_badge', { partyId, defaultValue: `Party ID: ${partyId}` })}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            bgcolor: 'rgba(255, 255, 255, 0.12)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    />
                )}
            </Box>
        </Paper>
    );
};
