import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, TextField, IconButton, Avatar, Paper, Container, Chip, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import QRCode from 'qrcode';
import { useWebRTC } from './audio/WebRTCContext';

interface MelodiqConnectionProps {
    onBack: () => void;
}

export const MelodiqConnection: React.FC<MelodiqConnectionProps> = ({ onBack }) => {
    // WebRTC Context
    const {
        peers: connectedPreviewPeers,
        partyId,
        regeneratePartyId,
        trackerUrls,
        addTrackerUrl: contextAddTrackerUrl,
        removeTrackerUrl: contextRemoveTrackerUrl,
        restoreDefaultTrackers
    } = useWebRTC();

    // UI State for adding new tracker
    const [newTrackerUrl, setNewTrackerUrl] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
        return localStorage.getItem('melodiq_host_base_url') || window.location.origin;
    });

    // Persist custom base URL
    useEffect(() => {
        localStorage.setItem('melodiq_host_base_url', customBaseUrl);
    }, [customBaseUrl]);

    // Generate QR Code when Party ID or Trackers change
    useEffect(() => {
        let baseUrl = customBaseUrl;
        // Basic validation/cleanup
        if (!baseUrl.startsWith('http')) {
            baseUrl = window.location.origin;
        }

        let url: URL;
        try {
            url = new URL(`${baseUrl}/games/melodiq/phone`);
        } catch (e) {
            // Fallback if custom URL is invalid
            url = new URL(`${window.location.origin}/games/melodiq/phone`);
        }

        url.searchParams.set('party', partyId);

        // Add all tracker URLs to the params
        trackerUrls.forEach(tracker => {
            // Filter out localhost trackers for the phone QR code as they won't work on the phone
            if (!tracker.includes('localhost') && !tracker.includes('127.0.0.1')) {
                url.searchParams.append('tracker', tracker);
            }
        });

        QRCode.toDataURL(url.toString(), { width: 300, margin: 2 })
            .then((url: string) => setQrCodeDataUrl(url))
            .catch((err: Error) => console.error('Failed to generate QR code:', err));
    }, [partyId, trackerUrls, customBaseUrl]);

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                    variant="outlined"
                    sx={{
                        borderRadius: 50,
                        px: 3,
                        py: 1,
                        borderColor: 'rgba(0,0,0,0.2)'
                    }}
                >
                    Back
                </Button>
                <Typography variant="h4">Connect Phones</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    Connect your phone to use as a microphone. Scan the QR code below.
                </Typography>

                {/* QR Code Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {qrCodeDataUrl && (
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                            <img src={qrCodeDataUrl} alt="QR Code" style={{ display: 'block', width: 250, height: 250 }} />
                        </Box>
                    )}

                    {/* Connection Status */}
                    {connectedPreviewPeers.length > 0 ? (
                        <Box sx={{ p: 2, bgcolor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 2, width: '100%', maxWidth: 500 }}>
                            <Typography variant="subtitle1" sx={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                ✅ {connectedPreviewPeers.length} Phone(s) Connected
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {connectedPreviewPeers.map(peer => (
                                    <Chip
                                        key={peer.id}
                                        avatar={<Avatar sx={{ bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}>{peer.name[0]}</Avatar>}
                                        label={peer.name}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.disabled">
                            Waiting for connections...
                        </Typography>
                    )}
                </Box>

                <Divider />

                {/* Advanced Settings */}
                <Box>
                    <Typography variant="h6" gutterBottom>Connection Details</Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Host Base URL</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Change this if your phone cannot reach the default address (e.g. use your LAN IP).
                            </Typography>
                            <TextField
                                value={customBaseUrl}
                                onChange={(e) => setCustomBaseUrl(e.target.value)}
                                size="small"
                                fullWidth
                                variant="outlined"
                                placeholder="http://192.168.1.X:3000"
                            />
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Party ID</Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    value={partyId}
                                    size="small"
                                    fullWidth
                                    variant="outlined"
                                    InputProps={{ readOnly: true }}
                                    sx={{ fontFamily: 'monospace' }}
                                />
                                <Button
                                    variant="outlined"
                                    onClick={regeneratePartyId}
                                    sx={{ borderRadius: 50 }}
                                >
                                    Regenerate
                                </Button>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Manual URL</Typography>
                            <TextField
                                value={(() => {
                                    let baseUrl = customBaseUrl;
                                    if (!baseUrl.startsWith('http')) baseUrl = window.location.origin;

                                    let url: URL;
                                    try {
                                        url = new URL(`${baseUrl}/games/melodiq/phone`);
                                    } catch (e) {
                                        url = new URL(`${window.location.origin}/games/melodiq/phone`);
                                    }

                                    url.searchParams.set('party', partyId);
                                    trackerUrls.forEach(tracker => {
                                        if (!tracker.includes('localhost') && !tracker.includes('127.0.0.1')) {
                                            url.searchParams.append('tracker', tracker);
                                        }
                                    });
                                    return url.toString();
                                })()}
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
                                helperText="Click to copy URL to send manually"
                            />
                        </Box>

                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" gutterBottom>Signaling Servers (Trackers)</Typography>
                                <Button
                                    size="small"
                                    onClick={restoreDefaultTrackers}
                                    variant="outlined"
                                    sx={{ borderRadius: 50 }}
                                >
                                    Restore Defaults
                                </Button>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {trackerUrls.map((url, index) => (
                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TextField
                                            value={url}
                                            size="small"
                                            fullWidth
                                            variant="outlined"
                                            InputProps={{ readOnly: true }}
                                        />
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => contextRemoveTrackerUrl(url)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                                {trackerUrls.length === 0 && (
                                    <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 1 }}>
                                        <Typography variant="body2" color="error">
                                            ⚠️ No signaling servers configured. Connection will not be possible.
                                            Please add a WSS tracker URL below.
                                        </Typography>
                                    </Box>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                        value={newTrackerUrl}
                                        onChange={(e) => setNewTrackerUrl(e.target.value)}
                                        placeholder="wss://tracker.example.com"
                                        size="small"
                                        fullWidth
                                        variant="outlined"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                contextAddTrackerUrl(newTrackerUrl);
                                                setNewTrackerUrl('');
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            contextAddTrackerUrl(newTrackerUrl);
                                            setNewTrackerUrl('');
                                        }}
                                        sx={{
                                            borderRadius: 50,
                                            px: 4,
                                            py: 1,
                                            backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                            boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                            color: 'white'
                                        }}
                                    >
                                        Add
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};
