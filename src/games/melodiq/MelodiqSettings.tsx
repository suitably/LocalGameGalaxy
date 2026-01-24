import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormControl, MenuItem, Select, Switch, FormControlLabel, Container, Paper, Divider, TextField, IconButton, Avatar, Popover, Slider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { MicrophoneManager } from './audio/MicrophoneManager';
import { WebRTCMicManager } from './audio/WebRTCMicManager';
import { LatencyCalibrator } from './components/LatencyCalibrator';
import QRCode from 'qrcode';


// Presets: Hue values
const COLOR_PRESETS = [
    { name: 'Cyan', hue: 190, color: 'hsl(190, 100%, 50%)' },
    { name: 'Green', hue: 120, color: 'hsl(120, 100%, 50%)' },
    { name: 'Blue', hue: 240, color: 'hsl(240, 100%, 50%)' },
    { name: 'Purple', hue: 270, color: 'hsl(270, 100%, 50%)' },
    { name: 'Pink', hue: 330, color: 'hsl(330, 100%, 50%)' },
    { name: 'Red', hue: 0, color: 'hsl(0, 100%, 50%)' },
    { name: 'Orange', hue: 30, color: 'hsl(30, 100%, 50%)' },
];

export interface UserProfile {
    id: string;
    name: string;
    hue: number;
}

export interface ActivePlayer {
    profileId: string;
    deviceId: string;
    volume?: number;
    muted?: boolean;
    latency?: number;
}

interface MelodiqSettingsProps {
    onBack: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack }) => {

    const loadInitialData = (): { profiles: UserProfile[], activePlayers: ActivePlayer[] } => {
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const storedActive = localStorage.getItem('melodiq_active_session');

        if (storedProfiles) {
            return {
                profiles: JSON.parse(storedProfiles),
                activePlayers: storedActive ? JSON.parse(storedActive) : []
            };
        }

        // Data Migration: Check for legacy P1/P2
        const p1Name = localStorage.getItem('melodiq_p1_name');
        const p2Name = localStorage.getItem('melodiq_p2_name');

        if (p1Name || p2Name) {
            const newProfiles: UserProfile[] = [];
            const newActive: ActivePlayer[] = [];

            // Migrate P1
            const p1Id = crypto.randomUUID();
            const p1Hue = parseInt(localStorage.getItem('melodiq_p1_hue') || '190');
            const p1Dev = localStorage.getItem('melodiq_p1_device') || '';
            newProfiles.push({ id: p1Id, name: p1Name || 'Player 1', hue: p1Hue });
            newActive.push({ profileId: p1Id, deviceId: p1Dev, volume: 0.8, muted: true, latency: 0 });

            // Migrate P2
            if (p2Name) {
                const p2Id = crypto.randomUUID();
                const p2Hue = parseInt(localStorage.getItem('melodiq_p2_hue') || '120');
                const p2Dev = localStorage.getItem('melodiq_p2_device') || '';
                newProfiles.push({ id: p2Id, name: p2Name || 'Player 2', hue: p2Hue });
                newActive.push({ profileId: p2Id, deviceId: p2Dev, volume: 0.8, muted: true, latency: 0 });
            }

            return { profiles: newProfiles, activePlayers: newActive };
        }

        // Fresh Start: Create Default Profile
        const defaultId = crypto.randomUUID();
        return {
            profiles: [{ id: defaultId, name: 'Player 1', hue: 190 }],
            activePlayers: [{ profileId: defaultId, deviceId: '', volume: 0.8, muted: true, latency: 0 }]
        };
    };



    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // Dynamic State
    // Dynamic State
    // Lazy load initial data to prevent hydration mismatch/double render logic (though this is client-only)
    const [initialData] = useState(loadInitialData);
    const [profiles, setProfiles] = useState<UserProfile[]>(initialData.profiles);
    const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>(initialData.activePlayers);

    // Game Settings
    const [showDebugOverlay, setShowDebugOverlay] = useState(localStorage.getItem('melodiq_show_overlay') === 'true');
    const [showDevSlider, setShowDevSlider] = useState(localStorage.getItem('melodiq_show_slider') === 'true');
    const [showMicStatus, setShowMicStatus] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_mic_status');
        return stored === null ? true : stored === 'true';
    });
    const [showNoteLabels, setShowNoteLabels] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    });
    const [layoutOverride, setLayoutOverride] = useState(localStorage.getItem('melodiq_layout_override') || '');

    // Volume Settings
    const [songVolume, setSongVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    });
    const [masterVolume, setMasterVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    });

    // WebRTC Remote Microphones
    const [partyId, setPartyId] = useState(() => {
        const stored = localStorage.getItem('melodiq_party_id');
        return stored || crypto.randomUUID();
    });
    const [trackerUrls, setTrackerUrls] = useState<string[]>(() => {
        const stored = localStorage.getItem('melodiq_tracker_urls');
        return stored ? JSON.parse(stored) : [
            'wss://tracker.openwebtorrent.com',
        ].concat(
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? [`ws://${window.location.hostname}:8000`]
                : []
        );
    });
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [newTrackerUrl, setNewTrackerUrl] = useState('');
    const [connectedPreviewPeers, setConnectedPreviewPeers] = useState<string[]>([]);



    // Preview Connection Effect (with automatic local tracker injection)
    useEffect(() => {
        if (!partyId) return;

        // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
        const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;

        // Build final tracker list
        // Filter out localhost/127.0.0.1 from stored list to avoid dupes/conflicts
        const cleaned = trackerUrls.filter(url => !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes(':8000'));

        const finalTrackers = [...cleaned];

        // Only add local tracker if we are actually ON localhost/127.0.0.1
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            finalTrackers.unshift(`ws://${hostname}:8000`);
        }

        if (finalTrackers.length === 0) return;

        console.log('[Settings] Starting WebRTCMicManager with trackers:', finalTrackers);
        const manager = new WebRTCMicManager(partyId, finalTrackers, {
            onPeerConnected: (peerId) => {
                setConnectedPreviewPeers(prev => [...prev, peerId]);
            },
            onPeerDisconnected: (peerId) => {
                setConnectedPreviewPeers(prev => prev.filter(p => p !== peerId));
            }
        });

        manager.start().catch(console.error);

        return () => {
            console.log('[Settings] Stopping WebRTCMicManager');
            manager.stop();
        };
    }, [partyId, trackerUrls]); // Re-run if ID or Trackers change

    // Color Picker State
    const [colorAnchorEl, setColorAnchorEl] = useState<HTMLElement | null>(null);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    const handleColorClick = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
        setEditingProfileId(profileId);
        setColorAnchorEl(event.currentTarget);
    };

    const handleColorClose = () => {
        setColorAnchorEl(null);
        setEditingProfileId(null);
    };

    // Player Settings Popover
    const [settingsAnchorEl, setSettingsAnchorEl] = useState<HTMLElement | null>(null);
    const [settingsProfileId, setSettingsProfileId] = useState<string | null>(null);

    const handleSettingsClick = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
        setSettingsProfileId(profileId);
        setSettingsAnchorEl(event.currentTarget);
    };

    const handleSettingsClose = () => {
        setSettingsAnchorEl(null);
        setSettingsProfileId(null);
    };

    // Device Refresh Logic
    const refreshDevices = async () => {
        setLoadingDevices(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devs = await MicrophoneManager.getDevices();
            setDevices(devs);
            setLoadingDevices(false);
            stream.getTracks().forEach(t => t.stop());
        } catch (err) {
            console.error('Failed to get permissions:', err);
            setLoadingDevices(false);
        }
    };

    // Initialize: Load Devices
    useEffect(() => {
        MicrophoneManager.getDevices().then(devs => {
            setDevices(devs);
            setLoadingDevices(false);
        });
    }, []);

    // Generate QR Code when Party ID or Trackers change
    useEffect(() => {
        const url = new URL(`${window.location.origin}/games/melodiq/phone`);
        url.searchParams.set('party', partyId);

        // Add all tracker URLs to the params
        trackerUrls.forEach(tracker => {
            // Filter out localhost trackers for the phone QR code as they won't work on the phone
            if (!tracker.includes('localhost') && !tracker.includes('127.0.0.1')) {
                url.searchParams.append('tracker', tracker);
            }
        });

        // Heuristic: If we are on a LAN IP (e.g. 192.168.x.x), and we don't have a local tracker in the list,
        // we might want to suggest one? But for now let's just use what is in the list.
        // Actually, if the Host is running on localhost, the phone URL generated will look like http://localhost:3000/...
        // which is useless for the phone.
        // But if the Host is running on a LAN IP (e.g. 192.168.1.5), then the URL is http://192.168.1.5:3000/...
        // In that case, we should probably add ws://192.168.1.5:8000 if it's not already there?
        // But let's stick to the explicit user request: provide the address "via qr code".

        QRCode.toDataURL(url.toString(), { width: 200, margin: 2 })
            .then((url: string) => setQrCodeDataUrl(url))
            .catch((err: Error) => console.error('Failed to generate QR code:', err));
    }, [partyId, trackerUrls]);

    // Save Logic
    const handleSave = () => {
        localStorage.setItem('melodiq_profiles', JSON.stringify(profiles));
        localStorage.setItem('melodiq_active_session', JSON.stringify(activePlayers));

        localStorage.setItem('melodiq_show_overlay', String(showDebugOverlay));
        localStorage.setItem('melodiq_show_slider', String(showDevSlider));
        localStorage.setItem('melodiq_show_mic_status', String(showMicStatus));
        localStorage.setItem('melodiq_show_note_labels', String(showNoteLabels));
        localStorage.setItem('melodiq_layout_override', layoutOverride);

        localStorage.setItem('melodiq_song_volume', String(songVolume));
        localStorage.setItem('melodiq_master_volume', String(masterVolume));

        // Save WebRTC settings
        localStorage.setItem('melodiq_party_id', partyId);
        localStorage.setItem('melodiq_tracker_urls', JSON.stringify(trackerUrls));

        onBack();
    };

    // --- Profile Management ---
    const addProfile = () => {
        const newProfile: UserProfile = {
            id: crypto.randomUUID(),
            name: `Player ${profiles.length + 1}`,
            hue: COLOR_PRESETS[profiles.length % COLOR_PRESETS.length].hue
        };
        setProfiles([...profiles, newProfile]);
    };

    const updateProfile = (id: string, updates: Partial<UserProfile>) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const deleteProfile = (id: string) => {
        setProfiles(profiles.filter(p => p.id !== id));
        setActivePlayers(activePlayers.filter(ap => ap.profileId !== id));
    };

    // --- Session Selection ---
    const toggleActivePlayer = (profileId: string) => {
        if (activePlayers.some(ap => ap.profileId === profileId)) {
            // Remove
            setActivePlayers(activePlayers.filter(ap => ap.profileId !== profileId));
        } else {
            // Add (Initialize with empty device or first available)
            const usedDevices = activePlayers.map(ap => ap.deviceId).filter(Boolean);
            const nextDevice = devices.find(d => !usedDevices.includes(d.deviceId))?.deviceId || '';

            setActivePlayers([...activePlayers, {
                profileId,
                deviceId: nextDevice,
                volume: 0.8,
                muted: true,
                latency: 0
            }]);
        }
    };

    const moveActivePlayer = (index: number, direction: 'up' | 'down') => {
        const newActive = [...activePlayers];
        if (direction === 'up' && index > 0) {
            [newActive[index], newActive[index - 1]] = [newActive[index - 1], newActive[index]];
        } else if (direction === 'down' && index < newActive.length - 1) {
            [newActive[index], newActive[index + 1]] = [newActive[index + 1], newActive[index]];
        }
        setActivePlayers(newActive);
    };

    const updateActivePlayerConfig = (profileId: string, updates: Partial<ActivePlayer>) => {
        setActivePlayers(activePlayers.map(ap => ap.profileId === profileId ? { ...ap, ...updates } : ap));
    };

    // --- WebRTC Remote Microphones ---
    const regeneratePartyId = () => {
        setPartyId(crypto.randomUUID());
    };

    const addTrackerUrl = () => {
        if (newTrackerUrl.trim() && !trackerUrls.includes(newTrackerUrl.trim())) {
            setTrackerUrls([...trackerUrls, newTrackerUrl.trim()]);
            setNewTrackerUrl('');
        }
    };

    const removeTrackerUrl = (url: string) => {
        setTrackerUrls(trackerUrls.filter(u => u !== url));
    };

    const restoreDefaultTrackers = () => {
        const reliableDefaults = ['wss://tracker.openwebtorrent.com'];
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            reliableDefaults.unshift(`ws://${window.location.hostname}:8000`);
        }
        setTrackerUrls(reliableDefaults);
    };


    // Render Helper
    // Helper removed in favor of Popover logic

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
                <Typography variant="h4">Settings</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* 1. Session Setup */}
                <Box>
                    <Typography variant="h6" gutterBottom>Session Setup</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Select who is playing today. Drag (Use arrows) to reorder priority/position.
                    </Typography>

                    <Button variant="outlined" size="small" onClick={refreshDevices} sx={{ mb: 2 }}>
                        Refresh Devices
                    </Button>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {profiles.length === 0 && <Typography>No profiles found.</Typography>}

                        {/* Active Roster */}
                        <Typography variant="subtitle2">Active Roster (Ordered)</Typography>
                        {activePlayers.map((ap, index) => {
                            const profile = profiles.find(p => p.id === ap.profileId);
                            if (!profile) return null;
                            return (
                                <Box key={ap.profileId} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <IconButton size="small" onClick={() => moveActivePlayer(index, 'up')} disabled={index === 0}>
                                            <Typography variant="caption">▲</Typography>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => moveActivePlayer(index, 'down')} disabled={index === activePlayers.length - 1}>
                                            <Typography variant="caption">▼</Typography>
                                        </IconButton>
                                    </Box>

                                    <Avatar sx={{ bgcolor: `hsl(${profile.hue}, 100%, 50%)`, width: 32, height: 32 }}>{profile.name[0]}</Avatar>
                                    <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{profile.name}</Typography>

                                    <Button
                                        size="small"
                                        onClick={() => {
                                            const newMuted = !(ap.muted ?? false);
                                            updateActivePlayerConfig(ap.profileId, { muted: newMuted });
                                        }}
                                        color={ap.muted ? "error" : "primary"}
                                        sx={{ minWidth: 40 }}
                                    >
                                        {ap.muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                                    </Button>

                                    <Slider
                                        size="small"
                                        value={typeof ap.volume === 'number' ? ap.volume * 100 : 80}
                                        min={0}
                                        max={100}
                                        onChange={(_, val) => updateActivePlayerConfig(ap.profileId, { volume: (val as number) / 100 })}
                                        sx={{ width: 80, mx: 2 }}
                                        disabled={ap.muted}
                                    />

                                    <FormControl sx={{ minWidth: 150 }} size="small">
                                        <Select
                                            value={loadingDevices ? 'loading' : (devices.some(d => d.deviceId === ap.deviceId) ? ap.deviceId : '')}
                                            onChange={(e) => updateActivePlayerConfig(ap.profileId, { deviceId: e.target.value })}
                                            disabled={loadingDevices}
                                            displayEmpty
                                            variant="standard"
                                        >
                                            <MenuItem value=""><em>No Device</em></MenuItem>
                                            {devices.map(d => (
                                                <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <IconButton size="small" onClick={(e) => handleSettingsClick(e, ap.profileId)}>
                                        <SettingsIcon fontSize="small" />
                                    </IconButton>

                                    <IconButton color="error" onClick={() => toggleActivePlayer(ap.profileId)}>
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                            );
                        })}

                        {/* Player Settings Popover */}
                        <Popover
                            open={Boolean(settingsAnchorEl)}
                            anchorEl={settingsAnchorEl}
                            onClose={handleSettingsClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'center',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'center',
                            }}
                        >
                            <Box sx={{ p: 2, minWidth: 250 }}>
                                <Typography variant="subtitle2" gutterBottom>Player Settings</Typography>

                                {(() => {
                                    const activeP = activePlayers.find(ap => ap.profileId === settingsProfileId);
                                    if (!activeP) return null;

                                    return (
                                        <Box>
                                            <Typography variant="caption" gutterBottom>Latency Compensation: {activeP.latency || 0}ms</Typography>
                                            <Slider
                                                size="small"
                                                value={activeP.latency || 0}
                                                min={0}
                                                max={500}
                                                step={10}
                                                onChange={(_, val) => updateActivePlayerConfig(settingsProfileId!, { latency: val as number })}
                                                valueLabelDisplay="auto"
                                            />
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Compensates for input delay.
                                            </Typography>

                                            <Divider sx={{ my: 1 }} />
                                            <LatencyCalibrator
                                                deviceId={activeP.deviceId}
                                                onComplete={(calibratedMs) => updateActivePlayerConfig(settingsProfileId!, { latency: calibratedMs })}
                                            />
                                        </Box>
                                    );
                                })()}
                            </Box>
                        </Popover>

                        {/* Available to Add */}
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>Available Profiles</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {profiles.filter(p => !activePlayers.some(ap => ap.profileId === p.id)).map(p => (
                                <Button
                                    key={p.id}
                                    variant="outlined"
                                    startIcon={<Typography sx={{ color: `hsl(${p.hue}, 100%, 50%)` }}>●</Typography>}
                                    onClick={() => toggleActivePlayer(p.id)}
                                >
                                    {p.name}
                                </Button>
                            ))}
                            {profiles.length === 0 && <Typography variant="caption">Create profiles above.</Typography>}
                        </Box>
                    </Box>
                </Box>

                <Divider />

                {/* 2. Manage User Profiles */}
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">User Profiles</Typography>
                        <Button startIcon={<PersonAddIcon />} variant="outlined" onClick={addProfile}>
                            New User
                        </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {profiles.map(profile => (
                            <Box key={profile.id} sx={{ p: 2, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: `hsl(${profile.hue}, 100%, 50%)` }}>
                                    {profile.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        label="Name"
                                        value={profile.name}
                                        onChange={(e) => updateProfile(profile.id, { name: e.target.value })}
                                        size="small"
                                        fullWidth
                                        variant="standard"
                                    />
                                    <Box
                                        onClick={(e) => handleColorClick(e, profile.id)}
                                        sx={{
                                            mt: 1,
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            bgcolor: `hsl(${profile.hue}, 100%, 50%)`,
                                            cursor: 'pointer',
                                            border: '2px solid white',
                                            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'scale(1.1)' }
                                        }}
                                        title="Change Color"
                                    />
                                </Box>
                                <IconButton onClick={() => deleteProfile(profile.id)} color="error" disabled={profiles.length <= 1}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Divider />

                {/* 3. Remote Microphones (WebRTC) */}
                <Box>
                    <Typography variant="h6" gutterBottom>Remote Microphones (Phone)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Connect phones as microphones via WebRTC. Scan the QR code with your phone to join.
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Party ID and QR Code */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>Party ID</Typography>
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
                                    size="small"
                                    onClick={regeneratePartyId}
                                    sx={{ mt: 1 }}
                                >
                                    Regenerate Party ID
                                </Button>
                            </Box>
                            {qrCodeDataUrl && (
                                <Box sx={{ p: 1, bgcolor: 'white', borderRadius: 1 }}>
                                    <img src={qrCodeDataUrl} alt="QR Code" style={{ display: 'block' }} />
                                </Box>
                            )}
                        </Box>

                        {/* Copyable URL */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Phone URL (Fallback)</Typography>
                            <TextField
                                value={(() => {
                                    const url = new URL(`${window.location.origin}/games/melodiq/phone`);
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
                                helperText="Click to copy URL"
                            />
                        </Box>

                        {/* Tracker URLs */}
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" gutterBottom>Tracker URLs</Typography>
                                <Button size="small" onClick={restoreDefaultTrackers} sx={{ fontSize: '0.7rem' }}>
                                    Restore Defaults
                                </Button>
                            </Box>

                            {/* Connection Preview Status */}
                            {connectedPreviewPeers.length > 0 && (
                                <Box sx={{ mb: 1, p: 1, bgcolor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 1 }}>
                                    <Typography variant="caption" sx={{ color: '#4ade80' }}>
                                        ✅ {connectedPreviewPeers.length} Phone(s) Connected Successfully!
                                    </Typography>
                                </Box>
                            )}

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
                                            onClick={() => removeTrackerUrl(url)}
                                            disabled={trackerUrls.length <= 1}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                ))}
                                <Box sx={{ display: 'flex', gap: 1 }}>
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
                                                addTrackerUrl();
                                            }
                                        }}
                                    />
                                    <Button variant="outlined" size="small" onClick={addTrackerUrl}>
                                        Add
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Divider />

                {/* Debug & Layout */}
                <Box>
                    <Typography variant="h6" gutterBottom>Game Settings</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Layout Override (e.g. 1.2 or 2.2)"
                            helperText="Define rows and columns manually (e.g., '1.3' for 1 top, 3 bottom). Leave empty for auto."
                            value={layoutOverride}
                            onChange={(e) => setLayoutOverride(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <Box sx={{ mt: 2 }}>
                            <Typography gutterBottom>Song Volume: {Math.round(songVolume * 100)}%</Typography>
                            <Slider
                                value={songVolume * 100}
                                onChange={(_, val) => setSongVolume((val as number) / 100)}
                                min={0}
                                max={100}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                        <Box sx={{ mt: 1 }}>
                            <Typography gutterBottom>Master Volume: {Math.round(masterVolume * 100)}%</Typography>
                            <Slider
                                value={masterVolume * 100}
                                onChange={(_, val) => setMasterVolume((val as number) / 100)}
                                min={0}
                                max={100}
                                sx={{ width: '100%' }}
                            />
                        </Box>
                        <FormControlLabel control={<Switch checked={showDebugOverlay} onChange={(e) => setShowDebugOverlay(e.target.checked)} />} label="Show Debug Overlay" />
                        <FormControlLabel control={<Switch checked={showDevSlider} onChange={(e) => setShowDevSlider(e.target.checked)} />} label="Show Tech/Dev Slider" />
                        <FormControlLabel control={<Switch checked={showMicStatus} onChange={(e) => setShowMicStatus(e.target.checked)} />} label="Show Mic Status" />
                        <FormControlLabel control={<Switch checked={showNoteLabels} onChange={(e) => setShowNoteLabels(e.target.checked)} />} label="Show Pitch Note Labels" />


                    </Box>
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="large" onClick={handleSave}>Save & Back</Button>
                </Box>

                <Popover
                    open={Boolean(colorAnchorEl)}
                    anchorEl={colorAnchorEl}
                    onClose={handleColorClose}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                >
                    <Box sx={{ p: 2, bgcolor: '#1a1a1a', minWidth: 200 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textAlign: 'center' }}>Pick Color</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: editingProfileId ? `hsl(${profiles.find(p => p.id === editingProfileId)?.hue || 0}, 100%, 50%)` : 'grey',
                                    border: '1px solid rgba(255,255,255,0.3)'
                                }}
                            />
                            <Slider
                                value={editingProfileId ? profiles.find(p => p.id === editingProfileId)?.hue || 0 : 0}
                                min={0}
                                max={360}
                                onChange={(_, val) => {
                                    if (editingProfileId) {
                                        updateProfile(editingProfileId, { hue: val as number });
                                    }
                                }}
                                sx={{
                                    width: 200,
                                    // Rainbow Gradient Track
                                    '& .MuiSlider-track': {
                                        border: 'none',
                                        background: 'transparent' // Hide default track
                                    },
                                    '& .MuiSlider-rail': {
                                        opacity: 1,
                                        background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #00f 83%, #f00 100%)',
                                        height: 8,
                                        borderRadius: 4
                                    },
                                    '& .MuiSlider-thumb': {
                                        height: 20,
                                        width: 20,
                                        backgroundColor: '#fff',
                                        border: '2px solid currentColor',
                                        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                                            boxShadow: 'inherit',
                                        },
                                        '&:before': {
                                            display: 'none',
                                        },
                                    },
                                    // Force color of thumb to match the HSL value? 
                                    // Or simpler: just white thumb is fine.
                                    color: 'white'
                                }}
                            />
                        </Box>
                    </Box>
                </Popover>
            </Paper>
        </Container >
    );
};
