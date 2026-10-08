import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { useLatencyCalibration } from './hooks/useLatencyCalibration';

interface RemoteLatencyCalibratorProps {
    onComplete: (latencyMs: number) => void;
    deviceId: string;
    sendClientCommand: (command: string, data?: any) => void;
}

export const RemoteLatencyCalibrator: React.FC<RemoteLatencyCalibratorProps> = ({ onComplete, deviceId, sendClientCommand }) => {

    const measureOneSample = (mic: MicrophoneManager, threshold: number): Promise<{ found: boolean, latency: number, peak: number }> => {
        return new Promise((resolve) => {
            const checkStart = Date.now();
            let detected = false;
            let peakVol = 0;
            
            // Tell the Host to play a loud beep
            sendClientCommand('CALIBRATE_PLAY_BEEP');

            const loop = () => {
                if (detected) return;
                const vol = mic.getCurrentVolume();
                if (vol > peakVol) peakVol = vol;

                const elapsed = Date.now() - checkStart;

                // Typical acoustic delay across a room is 10-30ms, plus TV audio lag (50-200ms)
                // Network RTT might be 5-20ms.
                if (vol > threshold && elapsed > 20) {
                    // Beep detected!
                    resolve({ found: true, latency: elapsed, peak: peakVol });
                    detected = true;
                    return;
                }

                if (elapsed > 1000) {
                    resolve({ found: false, latency: 0, peak: peakVol });
                    detected = true;
                    return;
                }

                requestAnimationFrame(loop);
            };

            // Start listening slightly before beep
            setTimeout(loop, 10);
        });
    };

    const { status, message, volume, debugInfo, startCalibration } = useLatencyCalibration(deviceId, onComplete, measureOneSample);

    return (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
            <Box sx={{ mb: 1 }}>
                {/* Volume Meter */}
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.min(100, volume * 300)}%`, height: '100%', bgcolor: volume > 0.1 ? '#4caf50' : '#ffa726', transition: 'width 0.1s' }} />
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>Mic Input Level</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={startCalibration}
                    disabled={status === 'running'}
                    sx={{
                        borderRadius: 50,
                        px: 3,
                        py: 1,
                        backgroundImage: status === 'running' ? 'none' : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: status === 'running' ? 'none' : '0 3px 5px 2px rgba(255, 105, 135, .3)',
                        color: 'white'
                    }}
                >
                    {status === 'running' ? 'Calibrating...' : 'Auto Calibrate'}
                </Button>
                {status === 'running' && <CircularProgress size={20} />}
            </Box>

            <Typography variant="caption" display="block">{message}</Typography>
            {debugInfo && (
                <Typography variant="caption" display="block" color="error" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    {debugInfo}
                </Typography>
            )}

            {status === 'idle' && (
                <Typography variant="caption" color="text.secondary">
                    Requires speakers on. Plays sounds.
                </Typography>
            )}
        </Box>
    );
};
