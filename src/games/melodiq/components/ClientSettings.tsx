import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useClientEngine } from '../PhoneClientEngine';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';
import { RemoteLatencyCalibrator } from './RemoteLatencyCalibrator';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const getNoteName = (midiNote: number): string => {
    const note = Math.round(midiNote);
    const octave = Math.floor(note / 12) - 1;
    return `${NOTE_NAMES[note % 12]}${octave}`;
};

const LiveMicTest: React.FC<{ deviceId: string }> = ({ deviceId }) => {
    const [volume, setVolume] = useState(0);
    const [pitch, setPitch] = useState<PitchResult | null>(null);

    useEffect(() => {
        let mounted = true;
        let animFrame = 0;
        let lastTime = 0;
        const mic = new MicrophoneManager();

        mic.start(deviceId || undefined).then(() => {
            if (!mounted) {
                mic.stop();
                return;
            }
            
            const loop = () => {
                if (!mounted) return;
                const now = performance.now();
                if (now - lastTime > 33) {
                    setVolume(mic.getCurrentVolume());
                    setPitch(mic.getPitch());
                    lastTime = now;
                }
                animFrame = requestAnimationFrame(loop);
            };
            loop();
        }).catch(err => {
            console.warn("MicTest failed to start:", err);
        });

        return () => {
            mounted = false;
            cancelAnimationFrame(animFrame);
            mic.stop();
        };
    }, [deviceId]);

    return (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: '#aaa', mb: 1, display: 'block' }}>
                Live Test
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1, height: 10, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.min(100, volume * 100)}%`, height: '100%', bgcolor: '#4caf50', transition: 'width 0.1s' }} />
                </Box>
                <Typography sx={{ minWidth: 50, textAlign: 'right', fontFamily: 'monospace', color: pitch ? '#00ffcc' : '#555' }}>
                    {pitch ? getNoteName(pitch.note) : '--'}
                </Typography>
            </Box>
        </Box>
    );
};

interface ClientSettingsProps {
    onBack: () => void;
}

export const ClientSettings: React.FC<ClientSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { clientProfile, updateClientProfile, sendClientCommand, activeSongId } = useClientEngine();

    const [name, setName] = useState(clientProfile.name);
    const [hue, setHue] = useState(clientProfile.hue);
    const [deviceId, setDeviceId] = useState(clientProfile.micDeviceId || '');
    const [displayMode, setDisplayMode] = useState(clientProfile.displayMode || 'lyrics');
    const [latency, setLatency] = useState(clientProfile.latency || 0);
    
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [permissionError, setPermissionError] = useState(false);

    useEffect(() => {
        let mounted = true;
        const loadDevices = async () => {
            try {
                // Request temporary stream to trigger permission prompt so labels are available
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const devs = await MicrophoneManager.getDevices();
                if (mounted) {
                    setDevices(devs);
                    setPermissionError(false);
                }
                stream.getTracks().forEach(t => t.stop());
            } catch (err) {
                console.error("Microphone permission denied:", err);
                if (mounted) {
                    setPermissionError(true);
                    // Fallback to whatever devices we can see without permission
                    const devs = await MicrophoneManager.getDevices();
                    setDevices(devs);
                }
            }
        };
        loadDevices();
        return () => { mounted = false; };
    }, []);

    const handleSave = () => {
        updateClientProfile({
            name,
            hue,
            micDeviceId: deviceId || undefined,
            displayMode: displayMode as any,
            latency
        });
        onBack();
    };

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2 }, minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, bgcolor: '#1a1a1a', color: 'white', borderRadius: 2.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {t('melodiq.client_settings', 'Player Profile')}
                </Typography>
                
                <TextField 
                    label={t('melodiq.name', 'Your Name')} 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{ input: { color: 'white' }, label: { color: '#ccc' } }}
                />

                <Box>
                    <Typography gutterBottom sx={{ color: '#ccc', mb: 1 }}>
                        {t('melodiq.color', 'Your Color')}
                    </Typography>
                    <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        value={hue} 
                        onChange={(e) => setHue(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <Box sx={{ mt: 2, width: '100%', height: 40, borderRadius: 2, bgcolor: `hsl(${hue}, 100%, 50%)`, boxShadow: '0px 0px 10px rgba(0,0,0,0.5)' }} />
                </Box>

                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel sx={{ color: '#ccc' }}>{t('melodiq.microphone', 'Microphone')}</InputLabel>
                    <Select
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        label={t('melodiq.microphone', 'Microphone')}
                        sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}
                    >
                        <MenuItem value="">
                            <em>{t('melodiq.default_mic', 'Default Microphone')}</em>
                        </MenuItem>
                        {devices.map(d => (
                            <MenuItem key={d.deviceId} value={d.deviceId}>
                                {d.label || `Microphone (ID: ${d.deviceId.substring(0, 5)})`}
                            </MenuItem>
                        ))}
                    </Select>
                    {permissionError && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                            {t('melodiq.mic_permission_denied', 'Permission denied. Could not load microphone names.')}
                        </Typography>
                    )}
                </FormControl>

                <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel sx={{ color: '#ccc' }}>{t('melodiq.display_mode', 'Display Mode')}</InputLabel>
                    <Select
                        value={displayMode}
                        onChange={(e) => setDisplayMode(e.target.value)}
                        label={t('melodiq.display_mode', 'Display Mode')}
                        sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' } }}
                    >
                        <MenuItem value="lyrics">{t('melodiq.display_lyrics_only', 'Only Lyrics')}</MenuItem>
                        <MenuItem value="self">{t('melodiq.display_self_pitch', 'My Pitch & Lyrics')}</MenuItem>
                        <MenuItem value="all">{t('melodiq.display_all_pitch', 'Everyone\'s Pitch')}</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ color: '#fff', mb: 1 }}>Sync & Latency</Typography>
                    <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
                        Current Latency Offset: {latency}ms
                    </Typography>
                    {activeSongId ? (
                        <Typography variant="caption" color="error">
                            Cannot calibrate while a song is playing.
                        </Typography>
                    ) : (
                        <RemoteLatencyCalibrator 
                            deviceId={deviceId} 
                            sendClientCommand={sendClientCommand} 
                            onComplete={(ms) => setLatency(ms)} 
                        />
                    )}
                </Box>

                <LiveMicTest deviceId={deviceId} />

                <Box sx={{ flex: 1 }} />

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button variant="outlined" onClick={onBack} fullWidth sx={{ color: 'white', borderColor: '#555' }}>
                        {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button variant="contained" onClick={handleSave} fullWidth sx={{ bgcolor: `hsl(${hue}, 100%, 40%)`, color: 'white' }}>
                        {t('common.save', 'Save')}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};
