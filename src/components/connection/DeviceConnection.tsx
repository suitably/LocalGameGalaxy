import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, TextField, IconButton, Avatar, Paper, Container, Chip, Divider, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { QRScannerDialog } from './QRScannerDialog';
import { buildDeviceConnectionUrl } from './connectionUrl';

export interface WebRTCConnectionData {
    peers: any[];
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    activeTrackerUrls: string[];
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

export interface DeviceConnectionProps {
    onBack: () => void;
    title?: string;
    description?: string;
    gameId: string; // Identifier used for setting UI properties locally
    clientPath: string; // the path for the phone app, e.g. '/games/melodiq?role=client'
    webrtcData: WebRTCConnectionData;
    renderPeerExtra?: (peer: any) => React.ReactNode;
    /** Extra settings / toggles to render on the connection screen */
    extraOptions?: React.ReactNode;
    /** localStorage key for the helper server URL (e.g. 'melodiq_helper_url').
     *  If provided, this URL (with localhost swapped for the target IP) is embedded
     *  in the QR code so the phone can reach the song library automatically. */
    helperStorageKey?: string;
    /** localStorage key for the helper auth token (e.g. 'melodiq_helper_token'). */
    helperTokenKey?: string;
}

export const DeviceConnection: React.FC<DeviceConnectionProps> = ({
    onBack,
    title = "Connect Devices",
    description = "Connect your phone to use as a controller. Scan the QR code below.",
    gameId,
    clientPath,
    webrtcData,
    renderPeerExtra,
    extraOptions,
    helperStorageKey,
    helperTokenKey,
}) => {
    const navigate = useNavigate();
    const {
        peers: connectedPreviewPeers,
        partyId,
        regeneratePartyId,
        trackerUrls,
        activeTrackerUrls = [], // fallback if not loaded
        addTrackerUrl: contextAddTrackerUrl,
        removeTrackerUrl: contextRemoveTrackerUrl,
        restoreDefaultTrackers
    } = webrtcData;

    // UI State for adding new tracker
    const [newTrackerUrl, setNewTrackerUrl] = useState('');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [scannerOpen, setScannerOpen] = useState(false);
    const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
        return localStorage.getItem(`${gameId}_host_base_url`) || window.location.origin;
    });

    /**
     * Called when a QR code is successfully scanned.
     *
     * IMPORTANT: SettingsProvider stays mounted when navigating within the same
     * route (host → client), so its [] useEffect does NOT re-run and cannot
     * parse helperUrl/token from the new URL. We therefore write the values
     * directly to localStorage here, then navigate.
     */
    const handleScanSuccess = (rawText: string) => {
        setScannerOpen(false);
        try {
            const scannedUrl = new URL(rawText);
            const scannedParams = scannedUrl.searchParams;

            // Apply helper config from scanned URL directly to localStorage
            const urlHelper = scannedParams.get('helperUrl');
            const urlToken = scannedParams.get('token') || scannedParams.get('apiKey');

            if (urlHelper && helperStorageKey) {
                localStorage.setItem(helperStorageKey, urlHelper);
                localStorage.setItem(`${gameId}_enable_helper`, 'true');
            }
            if (urlToken && helperTokenKey) {
                localStorage.setItem(helperTokenKey, urlToken);
            }

            // Tell listeners to reload with the new config
            if (urlHelper || urlToken) {
                window.dispatchEvent(new Event(`${gameId}_settings_updated`));
            }

            // Navigate to the full path including all query params
            const clientTarget = scannedUrl.pathname + scannedUrl.search + scannedUrl.hash;
            navigate(clientTarget);
        } catch {
            console.error('[QRScanner] Invalid URL scanned:', rawText);
        }
    };

    // Persist custom base URL
    useEffect(() => {
        localStorage.setItem(`${gameId}_host_base_url`, customBaseUrl);
    }, [customBaseUrl, gameId]);

    // Generate QR Code when Party ID or Trackers change
    useEffect(() => {
        const fullUrl = buildDeviceConnectionUrl({
            baseUrl: customBaseUrl,
            clientPath,
            partyId,
            trackerUrls: activeTrackerUrls
        });

        // No longer embed helper URL + token in QR code for security.
        // The Host acts as a WebRTC API proxy to forward requests without exposing the API key.

        QRCode.toDataURL(fullUrl, { width: 300, margin: 2 })
            .then((url: string) => setQrCodeDataUrl(url))
            .catch((err: Error) => console.error('Failed to generate QR code:', err));
    }, [partyId, activeTrackerUrls, customBaseUrl, clientPath, helperStorageKey, helperTokenKey]);

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
                <Typography variant="h4">{title}</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Typography variant="body1" color="text.secondary">
                    {description}
                </Typography>

                {/* QR Code Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {qrCodeDataUrl && (
                        <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
                            <img src={qrCodeDataUrl} alt="QR Code" style={{ display: 'block', width: 250, height: 250 }} />
                        </Box>
                    )}

                    {/* Scan to Join Button */}
                    <Tooltip title="Open camera to scan another host's QR code and join as a client">
                        <Button
                            variant="outlined"
                            startIcon={<QrCodeScannerIcon />}
                            onClick={() => setScannerOpen(true)}
                            sx={{
                                borderRadius: 50,
                                px: 3,
                                py: 1,
                                borderColor: 'rgba(144,202,249,0.5)',
                                color: '#90caf9',
                                '&:hover': {
                                    borderColor: '#90caf9',
                                    bgcolor: 'rgba(144,202,249,0.08)',
                                }
                            }}
                        >
                            Scan QR to Join another Host
                        </Button>
                    </Tooltip>

                    {/* QR Scanner Dialog */}
                    <QRScannerDialog
                        open={scannerOpen}
                        onClose={() => setScannerOpen(false)}
                        onScan={handleScanSuccess}
                    />

                    {/* Connection Status */}
                    {connectedPreviewPeers.length > 0 ? (
                        <Box sx={{ p: 2, bgcolor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 2, width: '100%', maxWidth: 500 }}>
                            <Typography variant="subtitle1" sx={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                ✅ {connectedPreviewPeers.length} Device(s) Connected
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flexDirection: 'column' }}>
                                {connectedPreviewPeers.map((peer: any) => (
                                    <Box key={peer.peerId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            avatar={<Avatar sx={{ bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}>{peer.name[0]}</Avatar>}
                                            label={peer.name}
                                            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        />
                                        {renderPeerExtra && renderPeerExtra(peer)}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.disabled">
                            Waiting for connections...
                        </Typography>
                    )}

                    {/* Extra Options (e.g. Scoreboard QR toggle) */}
                    {extraOptions}
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

                        {/* Helper URL is now proxied over WebRTC, so it is no longer embedded in the QR Code or manually needed on the phone */}

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Manual URL</Typography>
                            <TextField
                                value={buildDeviceConnectionUrl({
                                    baseUrl: customBaseUrl,
                                    clientPath,
                                    partyId,
                                    trackerUrls: activeTrackerUrls
                                })}
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
                                {activeTrackerUrls.map((url: string, index: number) => {
                                    const isSelfHosted = !trackerUrls.includes(url);
                                    return (
                                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TextField
                                                value={url}
                                                size="small"
                                                fullWidth
                                                variant="outlined"
                                                InputProps={{ readOnly: true }}
                                            />
                                            {isSelfHosted ? (
                                                <Chip
                                                    label="Self-Hosted"
                                                    color="success"
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ height: 32, px: 1, borderRadius: 2 }}
                                                />
                                            ) : (
                                                <IconButton
                                                    color="error"
                                                    size="small"
                                                    onClick={() => contextRemoveTrackerUrl(url)}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
                                        </Box>
                                    );
                                })}
                                {activeTrackerUrls.length === 0 && (
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
