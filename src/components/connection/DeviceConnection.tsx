import React from 'react';
import { Box, Button, Typography, TextField, Paper, Container, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';
import type { RemotePeerBase } from '../../lib/webrtc';
import { useDeviceConnectionSettings } from './useDeviceConnectionSettings';
import { DeviceQRCodeCard } from './DeviceQRCodeCard';
import { ConnectedPeersList } from './ConnectedPeersList';
import { DeviceTrackerSettings } from './DeviceTrackerSettings';
import type { DeviceConnectionProps } from './types';

export * from './types';

export const DeviceConnection = <T extends RemotePeerBase = RemotePeerBase>({
    onBack,
    title,
    description,
    gameId,
    clientPath,
    webrtcData,
    renderPeerExtra,
    extraOptions,
    helperStorageKey,
    helperTokenKey,
}: DeviceConnectionProps<T>): React.ReactElement => {
    const { t } = useTranslation();
    const displayTitle = title ?? t('connection.default_title', 'Connect Devices');
    const displayDescription = description ?? t('connection.default_description', 'Connect your phone to use as a controller. Scan the QR code below.');

    const {
        peers,
        partyId,
        regeneratePartyId,
        trackerUrls,
        activeTrackerUrls = [],
        allTrackers,
        toggleTrackerActive,
        addTrackerUrl,
        removeTrackerUrl,
        restoreDefaultTrackers,
    } = webrtcData;

    const {
        baseUrl,
        setBaseUrl,
        connectionUrl,
        qrCodeDataUrl,
        handleScanSuccess,
    } = useDeviceConnectionSettings({
        gameId,
        clientPath,
        partyId,
        activeTrackerUrls,
        helperStorageKey,
        helperTokenKey,
    });

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                    sx={{ borderRadius: 50, px: 3, py: 1, borderColor: 'rgba(0,0,0,0.2)' }}
                >
                    {t('common.back', 'Back')}
                </Button>
                <Typography variant="h4">{displayTitle}</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    {displayDescription}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <DeviceQRCodeCard
                        qrCodeDataUrl={qrCodeDataUrl}
                        onScanSuccess={handleScanSuccess}
                    />
                    <ConnectedPeersList
                        peers={peers}
                        renderPeerExtra={renderPeerExtra}
                    />
                    {extraOptions}
                </Box>

                <Divider />

                <Box>
                    <Typography variant="h6" gutterBottom>
                        {t('connection.details_title', 'Connection Details')}
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('connection.host_base_url', 'Host Base URL')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {t('connection.host_base_url_desc', 'Change this if your phone cannot reach the default address (e.g. use your LAN IP).')}
                            </Typography>
                            <TextField
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                size="small"
                                fullWidth
                                variant="outlined"
                                placeholder="http://192.168.1.X:3000"
                            />
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('connection.party_id', 'Party ID')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    value={partyId}
                                    size="small"
                                    fullWidth
                                    variant="outlined"
                                    InputProps={{ readOnly: true }}
                                    sx={{ fontFamily: 'monospace' }}
                                />
                                <Button variant="outlined" onClick={regeneratePartyId} sx={{ borderRadius: 50 }}>
                                    {t('connection.regenerate', 'Regenerate')}
                                </Button>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                {t('connection.manual_url', 'Manual URL')}
                            </Typography>
                            <TextField
                                value={connectionUrl}
                                size="small"
                                fullWidth
                                variant="outlined"
                                InputProps={{ readOnly: true }}
                                onClick={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    input.select();
                                    navigator.clipboard.writeText(input.value);
                                }}
                                sx={{ cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.85rem' }}
                                helperText={t('connection.click_to_copy', 'Click to copy URL to send manually')}
                            />
                        </Box>

                        <DeviceTrackerSettings
                            allTrackers={allTrackers}
                            activeTrackerUrls={activeTrackerUrls}
                            trackerUrls={trackerUrls}
                            toggleTrackerActive={toggleTrackerActive}
                            addTrackerUrl={addTrackerUrl}
                            removeTrackerUrl={removeTrackerUrl}
                            restoreDefaultTrackers={restoreDefaultTrackers}
                        />
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};
