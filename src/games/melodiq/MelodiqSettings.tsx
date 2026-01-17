import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormControl, MenuItem, Select, Switch, FormControlLabel, Container, Paper, Divider, TextField, IconButton, Avatar } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { MicrophoneManager } from './audio/MicrophoneManager';

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
}

interface MelodiqSettingsProps {
    onBack: () => void;
}

export const MelodiqSettings: React.FC<MelodiqSettingsProps> = ({ onBack }) => {
    // Audio Devices
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [loadingDevices, setLoadingDevices] = useState(true);

    // Dynamic State
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);

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

    // Initialize: Load Profiles & Devices
    useEffect(() => {
        // 1. Load Audio Devices
        setLoadingDevices(true);
        MicrophoneManager.getDevices().then(devs => {
            setDevices(devs);
            setLoadingDevices(false);
        });

        // 2. Load Profiles & Active Session
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const storedActive = localStorage.getItem('melodiq_active_session');

        if (storedProfiles) {
            setProfiles(JSON.parse(storedProfiles));
            if (storedActive) {
                setActivePlayers(JSON.parse(storedActive));
            }
        } else {
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
                newActive.push({ profileId: p1Id, deviceId: p1Dev });

                // Migrate P2
                if (p2Name) { // Only enable P2 if it had a name set or was used
                    const p2Id = crypto.randomUUID();
                    const p2Hue = parseInt(localStorage.getItem('melodiq_p2_hue') || '120');
                    const p2Dev = localStorage.getItem('melodiq_p2_device') || '';
                    newProfiles.push({ id: p2Id, name: p2Name || 'Player 2', hue: p2Hue });
                    // User legacy logic was P2 active if set.
                    newActive.push({ profileId: p2Id, deviceId: p2Dev });
                }

                setProfiles(newProfiles);
                setActivePlayers(newActive);
            } else {
                // Fresh Start: Create Default Profile
                const defaultId = crypto.randomUUID();
                const defaultProfile = { id: defaultId, name: 'Player 1', hue: 190 };
                setProfiles([defaultProfile]);
                setActivePlayers([{ profileId: defaultId, deviceId: '' }]);
            }
        }
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

            setActivePlayers([...activePlayers, { profileId, deviceId: nextDevice }]);
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

    const updateActiveMic = (profileId: string, deviceId: string) => {
        setActivePlayers(activePlayers.map(ap => ap.profileId === profileId ? { ...ap, deviceId } : ap));
    };


    // Render Helper
    const renderColorPicker = (selectedHue: number, onChange: (hue: number) => void) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
            {COLOR_PRESETS.map((preset) => (
                <Box
                    key={preset.hue}
                    onClick={() => onChange(preset.hue)}
                    sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: preset.color,
                        cursor: 'pointer',
                        border: selectedHue === preset.hue ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: selectedHue === preset.hue ? `0 0 8px ${preset.color}` : 'none',
                    }}
                    title={preset.name}
                />
            ))}
        </Box>
    );

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Back</Button>
                <Typography variant="h4">Settings</Typography>
            </Box>

            <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>

                {/* 1. Manage User Profiles */}
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
                                    {renderColorPicker(profile.hue, (h) => updateProfile(profile.id, { hue: h }))}
                                </Box>
                                <IconButton onClick={() => deleteProfile(profile.id)} color="error" disabled={profiles.length <= 1}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Divider />

                {/* 2. Session Setup */}
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

                        {/* Render ACTIVE players first (for reordering), then INACTIVE */}
                        {/* Actually, the requirement is to enable/disable. 
                             To support reordering of ACTIVE only, we should probably render the Active list separate from the "Add to Session" selection.
                             But to keep it simple: Render ALL profiles, but the order of ActivePlayers determines their visual order if we rendered only active.
                             Wait, if we render all, how do we visualize the order of active ones?
                             
                             Better approach:
                             1. "Active Roster": List of `activePlayers`. Show name, mic, and Up/Down arrows. Remove button (X).
                             2. "Available Profiles": List of profiles NOT in activePlayers. "Add" button (+).
                          */}

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

                                    <FormControl sx={{ minWidth: 150 }} size="small">
                                        <Select
                                            value={loadingDevices ? 'loading' : (devices.some(d => d.deviceId === ap.deviceId) ? ap.deviceId : '')}
                                            onChange={(e) => updateActiveMic(ap.profileId, e.target.value)}
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

                                    <IconButton color="error" onClick={() => toggleActivePlayer(ap.profileId)}>
                                        <Typography variant="h6">×</Typography>
                                    </IconButton>
                                </Box>
                            );
                        })}

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
                        <FormControlLabel control={<Switch checked={showDebugOverlay} onChange={(e) => setShowDebugOverlay(e.target.checked)} />} label="Show Debug Overlay" />
                        <FormControlLabel control={<Switch checked={showDevSlider} onChange={(e) => setShowDevSlider(e.target.checked)} />} label="Show Tech/Dev Slider" />
                        <FormControlLabel control={<Switch checked={showMicStatus} onChange={(e) => setShowMicStatus(e.target.checked)} />} label="Show Mic Status" />
                        <FormControlLabel control={<Switch checked={showNoteLabels} onChange={(e) => setShowNoteLabels(e.target.checked)} />} label="Show Pitch Note Labels" />
                    </Box>
                </Box>

                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="large" onClick={handleSave}>Save & Back</Button>
                </Box>
            </Paper>
        </Container>
    );
};
