import React, { useState } from 'react';
import {
    Box, Button, Typography, FormControl, MenuItem, Select, Slider,
    IconButton, Avatar, Popover, Chip, Divider
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { UserProfile, ActivePlayer } from '../types';
import { LatencyCalibrator } from './LatencyCalibrator';
import { useWebRTC } from '../audio/WebRTCContext';

interface SessionSetupProps {
    profiles: UserProfile[];
    activePlayers: ActivePlayer[];
    devices: MediaDeviceInfo[];
    loadingDevices: boolean;
    onRefreshDevices: () => void;
    onToggleActivePlayer: (profileId: string) => void;
    onMoveActivePlayer: (index: number, direction: 'up' | 'down') => void;
    onUpdateActivePlayerConfig: (profileId: string, updates: Partial<ActivePlayer>) => void;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({
    profiles,
    activePlayers,
    devices,
    loadingDevices,
    onRefreshDevices,
    onToggleActivePlayer,
    onMoveActivePlayer,
    onUpdateActivePlayerConfig
}) => {
    const { peers: connectedPreviewPeers, activePeers, inactivePeers, togglePeerActive } = useWebRTC();

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

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Session Setup</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Select who is playing today. Drag (Use arrows) to reorder priority/position.
            </Typography>

            <Button
                variant="outlined"
                onClick={onRefreshDevices}
                sx={{ mb: 2, borderRadius: 50, px: 3 }}
                startIcon={<RefreshIcon />}
            >
                Refresh Devices
            </Button>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {profiles.length === 0 && <Typography>No profiles found.</Typography>}

                {/* Active Roster */}
                <Typography variant="subtitle2">Active Roster (Ordered)</Typography>
                {activePlayers.map((ap, index) => {
                    const isBot = ap.profileId === 'BOT';
                    const profile = isBot
                        ? { id: 'BOT', name: 'Bot (Auto-Sing)', hue: 0 }
                        : profiles.find(p => p.id === ap.profileId);

                    if (!profile) return null;
                    return (
                        <Box key={ap.profileId} sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            alignItems: { xs: 'stretch', md: 'center' },
                            gap: 2,
                            p: { xs: 1.5, md: 1 },
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 1
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <IconButton size="small" onClick={() => onMoveActivePlayer(index, 'up')} disabled={index === 0}>
                                        <Typography variant="caption">▲</Typography>
                                    </IconButton>
                                    <IconButton size="small" onClick={() => onMoveActivePlayer(index, 'down')} disabled={index === activePlayers.length - 1}>
                                        <Typography variant="caption">▼</Typography>
                                    </IconButton>
                                </Box>

                                <Avatar sx={{ bgcolor: isBot ? '#FF4081' : `hsl(${profile.hue}, 100%, 50%)`, width: 32, height: 32 }}>
                                    {isBot ? '🤖' : profile.name[0]}
                                </Avatar>
                                <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{profile.name}</Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                                <Button
                                    size="small"
                                    onClick={() => {
                                        const newMuted = !(ap.muted ?? false);
                                        onUpdateActivePlayerConfig(ap.profileId, { muted: newMuted });
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
                                    onChange={(_, val) => onUpdateActivePlayerConfig(ap.profileId, { volume: (val as number) / 100 })}
                                    sx={{ width: 80, mx: 2 }}
                                    disabled={ap.muted}
                                />

                                {!isBot && (
                                    <FormControl sx={{ minWidth: 150 }} size="small">
                                        <Select
                                            value={loadingDevices ? 'loading' : (
                                                ap.deviceId === 'BOT' || devices.some(d => d.deviceId === ap.deviceId) || connectedPreviewPeers.some(p => p.id === ap.deviceId)
                                                    ? ap.deviceId : ''
                                            )}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const isPhone = connectedPreviewPeers.some(p => p.id === val);
                                                onUpdateActivePlayerConfig(ap.profileId, { deviceId: val, isRemote: isPhone });
                                            }}
                                            disabled={loadingDevices}
                                            displayEmpty
                                            variant="standard"
                                        >
                                            <MenuItem value=""><em>No Device</em></MenuItem>
                                            {loadingDevices && <MenuItem value="loading" disabled>Loading...</MenuItem>}
                                            {devices.map(d => (
                                                <MenuItem key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</MenuItem>
                                            ))}
                                            <Divider />
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
                                )}
                                {isBot && <Typography variant="caption" sx={{ minWidth: 150, textAlign: 'center' }}>Auto-Sing Enabled</Typography>}

                                {!isBot && (
                                    <IconButton size="small" onClick={(e) => handleSettingsClick(e, ap.profileId)}>
                                        <SettingsIcon fontSize="small" />
                                    </IconButton>
                                )}

                                <IconButton color="error" onClick={() => onToggleActivePlayer(ap.profileId)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </Box>
                    );
                })}

                {/* Active Phones in Roster */}
                {activePeers.map((peer) => (
                    <Box key={peer.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, bgcolor: 'rgba(100,100,255,0.05)' }}>
                        <Typography sx={{ width: 24, textAlign: 'center' }}>📱</Typography>
                        <Avatar sx={{ bgcolor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : 'grey', width: 32, height: 32 }}>{peer.name[0]}</Avatar>
                        <Typography sx={{ flex: 1, fontWeight: 'bold' }}>{peer.name}</Typography>
                        <Chip label="Phone" size="small" variant="outlined" />
                        <IconButton color="error" onClick={() => togglePeerActive(peer.id)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                ))}

                {/* Player Settings Popover */}
                <Popover
                    open={Boolean(settingsAnchorEl)}
                    anchorEl={settingsAnchorEl}
                    onClose={handleSettingsClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
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
                                        onChange={(_, val) => onUpdateActivePlayerConfig(settingsProfileId!, { latency: val as number })}
                                        valueLabelDisplay="auto"
                                    />
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Compensates for input delay.
                                    </Typography>

                                    <Divider sx={{ my: 1 }} />
                                    <LatencyCalibrator
                                        deviceId={activeP.deviceId}
                                        onComplete={(calibratedMs) => onUpdateActivePlayerConfig(settingsProfileId!, { latency: calibratedMs })}
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
                            onClick={() => onToggleActivePlayer(p.id)}
                            sx={{ borderRadius: 50 }}
                        >
                            {p.name}
                        </Button>
                    ))}

                    {/* Add Bot Button */}
                    {!activePlayers.some(ap => ap.profileId === 'BOT') && (
                        <Button
                            variant="outlined"
                            startIcon={<Typography>🤖</Typography>}
                            onClick={() => onToggleActivePlayer('BOT')}
                            sx={{ borderRadius: 50, borderColor: '#FF4081', color: '#FF4081' }}
                        >
                            Bot (Auto-Sing)
                        </Button>
                    )}

                    {profiles.length === 0 && <Typography variant="caption">Create profiles above.</Typography>}

                    {/* Inactive Phones */}
                    {inactivePeers.map(peer => (
                        <Button
                            key={peer.id}
                            variant="outlined"
                            startIcon={<Typography>📱</Typography>}
                            onClick={() => togglePeerActive(peer.id)}
                            sx={{ borderColor: peer.hue ? `hsl(${peer.hue}, 100%, 50%)` : undefined }}
                        >
                            {peer.name}
                        </Button>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};
