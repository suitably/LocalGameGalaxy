import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormControl, MenuItem, Select, Switch, FormControlLabel, Container, Paper, Divider, TextField, IconButton, Avatar, Popover, Slider, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SettingsIcon from '@mui/icons-material/Settings';
import { MicrophoneManager } from './audio/MicrophoneManager';
import { LatencyCalibrator } from './components/LatencyCalibrator';
import { useWebRTC } from './audio/WebRTCContext';



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
    isRemote?: boolean;
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
    // Volume Settings
    const [songVolume, setSongVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    });
    const [masterVolume, setMasterVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    });

    // WebRTC Context (Only needed for Phone Assignment in Dropdown)
    const { peers: connectedPreviewPeers } = useWebRTC();

    // Color Picker State

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

        // Save WebRTC settings - NOT NEEDED here anymore, handled by Context/Connection page
        // But we DO need to ensure partyId is preserved if we ever re-init? 
        // Actually Context handles persistence.

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
                                            value={loadingDevices ? 'loading' : (
                                                devices.some(d => d.deviceId === ap.deviceId) || connectedPreviewPeers.some(p => p.id === ap.deviceId)
                                                    ? ap.deviceId : ''
                                            )}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const isPhone = connectedPreviewPeers.some(p => p.id === val);
                                                updateActivePlayerConfig(ap.profileId, { deviceId: val, isRemote: isPhone });
                                            }}
                                            disabled={loadingDevices}
                                            displayEmpty
                                            variant="standard"
                                        >
                                            <MenuItem value=""><em>No Device</em></MenuItem>
                                            {/* Local Devices */}
                                            {devices.map(d => (
                                                <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</MenuItem>
                                            ))}
                                            {/* Remote Devices (Phones) */}
                                            {connectedPreviewPeers.length > 0 && <Divider />}
                                            {connectedPreviewPeers.length > 0 && <MenuItem disabled><em>Phones</em></MenuItem>}
                                            {connectedPreviewPeers.map(p => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography>📱 {p.name}</Typography>
                                                        {p.hue && <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: `hsl(${p.hue}, 100%, 50%)` }} />}
                                                    </Box>
                                                </MenuItem>
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
