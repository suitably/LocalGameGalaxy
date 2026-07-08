import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, List, ListItem, ListItemText, Switch, LinearProgress, IconButton, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { MicrophoneManager } from '../audio/MicrophoneManager';

const MicVolumeMeter: React.FC<{ deviceId: string }> = ({ deviceId }) => {

    const [volume, setVolume] = useState(0);

    useEffect(() => {
        let active = true;
        let animationFrame: number;
        const mic = new MicrophoneManager();

        const startMic = async () => {
            try {
                // start(deviceId, initialVolume, initialMuted)
                await mic.start(deviceId);
                
                const updateVolume = () => {
                    if (!active) return;
                    const v = mic.getCurrentVolume();
                    // RMS ranges roughly 0 to 1, but typical voice is lower. Scale it up for visuals.
                    setVolume(Math.min(100, v * 300)); 
                    animationFrame = requestAnimationFrame(updateVolume);
                };
                updateVolume();
            } catch (e) {
                console.error("Failed to start mic meter", e);
            }
        };

        startMic();

        return () => {
            active = false;
            cancelAnimationFrame(animationFrame);
            mic.stop();
        };
    }, [deviceId]);

    return (
        <Box sx={{ width: 100, ml: 2, mr: 2 }}>
            <LinearProgress 
                variant="determinate" 
                value={volume} 
                sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': {
                        transition: 'transform 0.05s linear' // Make it fast and snappy
                    }
                }} 
            />
        </Box>
    );
};

export const HardwareMicSetup: React.FC = () => {
    const { t } = useTranslation();
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [enabledMics, setEnabledMics] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('melodiq_mic_slots');
            return stored ? JSON.parse(stored).filter((id: string) => id) : [];
        } catch {
            return [];
        }
    });
    const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
        try {
            const stored = localStorage.getItem('melodiq_mic_names');
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const loadDevices = async () => {
        try {
            // Request permission to ensure we get labels
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const devs = await MicrophoneManager.getDevices();
            setDevices(devs);
            
            // Cache original labels for the Queue Dialog
            const originalNames: Record<string, string> = {};
            devs.forEach(d => {
                if (d.label) originalNames[d.deviceId] = d.label;
            });
            localStorage.setItem('melodiq_mic_original_names', JSON.stringify(originalNames));

            stream.getTracks().forEach(t => t.stop());
        } catch (e) {
            console.error("Could not load media devices", e);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDevices();
    }, []);

    const toggleMic = (deviceId: string) => {
        let newEnabled = [...enabledMics];
        if (newEnabled.includes(deviceId)) {
            newEnabled = newEnabled.filter(id => id !== deviceId);
        } else {
            newEnabled.push(deviceId);
        }
        setEnabledMics(newEnabled);
        localStorage.setItem('melodiq_mic_slots', JSON.stringify(newEnabled));
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{t('melodiq.hardware_mic')}</Typography>
                <Button variant="outlined" size="small" onClick={loadDevices}>Refresh Devices</Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Aktiviere hier die echten Mikrofone, die beim Singen verwendet werden dürfen. 
                Webcams oder ungenutzte Anschlüsse solltest du deaktiviert lassen.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Das erste Mikrofon in der Liste bekommt "Spieler 1", das zweite bekommt "Spieler 2", usw.
            </Typography>

            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {devices.map((d, index) => {
                    const isEnabled = enabledMics.includes(d.deviceId);
                    const orderIndex = enabledMics.indexOf(d.deviceId);
                    const isEditing = editingId === d.deviceId;
                    const displayName = customNames[d.deviceId] || d.label || 'Unknown Audio Device';

                    let subtext = 'Deaktiviert';
                    if (isEnabled) {
                        subtext = `Aktiv (Zugewiesen an lokalen Spieler ${orderIndex + 1})`;
                    }

                    return (
                        <ListItem key={d.deviceId} divider={index < devices.length - 1}>
                            {isEditing ? (
                                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', mr: 2 }}>
                                    <TextField 
                                        size="small" 
                                        fullWidth 
                                        value={editValue} 
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                const newNames = { ...customNames, [d.deviceId]: editValue };
                                                setCustomNames(newNames);
                                                localStorage.setItem('melodiq_mic_names', JSON.stringify(newNames));
                                                setEditingId(null);
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <IconButton onClick={() => {
                                        const newNames = { ...customNames, [d.deviceId]: editValue };
                                        setCustomNames(newNames);
                                        localStorage.setItem('melodiq_mic_names', JSON.stringify(newNames));
                                        setEditingId(null);
                                    }}>
                                        <CheckIcon />
                                    </IconButton>
                                </Box>
                            ) : (
                                <>
                                    <ListItemText 
                                        primary={displayName} 
                                        secondary={subtext}
                                        sx={{ color: isEnabled ? 'text.primary' : 'text.disabled' }}
                                    />
                                    <IconButton size="small" onClick={() => {
                                        setEditingId(d.deviceId);
                                        setEditValue(displayName);
                                    }} sx={{ mr: 1, opacity: isEnabled ? 1 : 0.5 }}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </>
                            )}
                            {isEnabled && !isEditing && <MicVolumeMeter deviceId={d.deviceId} />}
                            <Switch
                                edge="end"
                                checked={isEnabled}
                                onChange={() => toggleMic(d.deviceId)}
                            />
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
};
