import React, { useEffect, useState, useMemo } from 'react';
import { Box, Button, Typography, TextField, IconButton, Avatar, Paper, Container, Chip, Divider, Tooltip, Switch } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRScannerDialog } from './QRScannerDialog';
import { buildDeviceConnectionUrl } from './connectionUrl';
import type { TrackerItem } from '../../lib/webrtc';

export interface WebRTCConnectionData {
    peers: any[];
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    activeTrackerUrls: string[];
    disabledTrackerUrls?: string[];
    allTrackers?: TrackerItem[];
    toggleTrackerActive?: (url: string, enabled?: boolean) => void;
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
    const { t } = useTranslation();
    const {
        peers: connectedPreviewPeers,
        partyId,
        regeneratePartyId,
        trackerUrls,
        activeTrackerUrls = [], // fallback if not loaded
        allTrackers: contextAllTrackers,
        toggleTrackerActive: contextToggleTrackerActive,
        addTrackerUrl: contextAddTrackerUrl,
        removeTrackerUrl: contextRemoveTrackerUrl,
        restoreDefaultTrackers
    } = webrtcData;

    const trackersToDisplay: TrackerItem[] = useMemo(() => {
        if (contextAllTrackers && contextAllTrackers.length > 0) {
            return contextAllTrackers;
        }
        const allUrls = Array.from(new Set([...activeTrackerUrls, ...trackerUrls]));
        return allUrls.map(url => ({
            url,
            type: trackerUrls.includes(url) ? ('custom' as const) : ('public' as const),
            enabled: activeTrackerUrls.includes(url)
        }));
    }, [contextAllTrackers, activeTrackerUrls, trackerUrls]);

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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Typography variant="subtitle2">{t('signaling.title', 'Signaling Servers (Trackers)')}</Typography>
                                <Button
                                    size="small"
                                    onClick={restoreDefaultTrackers}
                                    variant="outlined"
                                    sx={{ borderRadius: 50 }}
                                >
                                    {t('signaling.restore_defaults', 'Restore Defaults')}
                                </Button>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {trackersToDisplay.map((item, index: number) => {
                                    const isCustom = item.type === 'custom';
                                    const isBackend = item.type === 'backend';
                                    const isPublic = item.type === 'public';

                                    return (
                                        <Paper
                                            key={item.url || index}
                                            elevation={0}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                p: 1,
                                                px: 1.5,
                                                borderRadius: 2,
                                                bgcolor: item.enabled ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.2)',
                                                border: '1px solid',
                                                borderColor: item.enabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                                opacity: item.enabled ? 1 : 0.6,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <Tooltip title={item.enabled ? t('signaling.toggle_disable', 'Server deaktivieren') : t('signaling.toggle_enable', 'Server aktivieren')}>
                                                <Switch
                                                    size="small"
                                                    checked={item.enabled}
                                                    onChange={() => {
                                                        if (contextToggleTrackerActive) {
                                                            contextToggleTrackerActive(item.url, !item.enabled);
                                                        } else if (item.enabled) {
                                                            contextRemoveTrackerUrl(item.url);
                                                        } else {
                                                            contextAddTrackerUrl(item.url);
                                                        }
                                                    }}
                                                    color={isBackend ? 'success' : isPublic ? 'primary' : 'secondary'}
                                                />
                                            </Tooltip>

                                            <TextField
                                                value={item.url}
                                                size="small"
                                                fullWidth
                                                variant="standard"
                                                InputProps={{
                                                    readOnly: true,
                                                    disableUnderline: true,
                                                    sx: {
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.85rem',
                                                        color: item.enabled ? 'text.primary' : 'text.disabled'
                                                    }
                                                }}
                                            />

                                            {isBackend && (
                                                <Chip
                                                    label={t('signaling.type_backend', 'Self-Hosted')}
                                                    color="success"
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                />
                                            )}
                                            {isPublic && (
                                                <Chip
                                                    label={t('signaling.type_public', 'Free / Public')}
                                                    color="info"
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                />
                                            )}
                                            {isCustom && (
                                                <Chip
                                                    label={t('signaling.type_custom', 'Custom')}
                                                    color="secondary"
                                                    variant="outlined"
                                                    size="small"
                                                    sx={{ height: 26, px: 0.5, borderRadius: 1.5, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                                />
                                            )}

                                            {isCustom && (
                                                <Tooltip title={t('signaling.remove_tooltip', 'Tracker entfernen')}>
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => contextRemoveTrackerUrl(item.url)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Paper>
                                    );
                                })}

                                {activeTrackerUrls.length === 0 && (
                                    <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 2 }}>
                                        <Typography variant="body2" color="error">
                                            {t('signaling.no_trackers_warning', '⚠️ Keine Signaling-Server aktiv. Verbindung zu Mobilgeräten wird nicht möglich sein. Bitte mindestens einen Server aktivieren.')}
                                        </Typography>
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <TextField
                                        value={newTrackerUrl}
                                        onChange={(e) => setNewTrackerUrl(e.target.value)}
                                        placeholder={t('signaling.placeholder', 'wss://tracker.example.com')}
                                        size="small"
                                        fullWidth
                                        variant="outlined"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newTrackerUrl.trim()) {
                                                    contextAddTrackerUrl(newTrackerUrl.trim());
                                                    setNewTrackerUrl('');
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            if (newTrackerUrl.trim()) {
                                                contextAddTrackerUrl(newTrackerUrl.trim());
                                                setNewTrackerUrl('');
                                            }
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
                                        {t('signaling.add_button', 'Add')}
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
