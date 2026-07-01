import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { MicrophoneManager } from '../audio/MicrophoneManager';

interface RemoteLatencyCalibratorProps {
    onComplete: (latencyMs: number) => void;
    deviceId: string;
    sendClientCommand: (command: string, data?: any) => void;
}

export const RemoteLatencyCalibrator: React.FC<RemoteLatencyCalibratorProps> = ({ onComplete, deviceId, sendClientCommand }) => {
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
    const [message, setMessage] = useState('');
    const [volume, setVolume] = useState(0);
    const [debugInfo, setDebugInfo] = useState('');
    const micRef = useRef<MicrophoneManager | null>(null);
    const volumeReqRef = useRef<number | null>(null);

    // Volume Meter Loop
    useEffect(() => {
        const updateVol = () => {
            if (micRef.current) {
                setVolume(micRef.current.getCurrentVolume());
            }
            volumeReqRef.current = requestAnimationFrame(updateVol);
        };
        updateVol();
        return () => {
            if (volumeReqRef.current !== null) cancelAnimationFrame(volumeReqRef.current);
        };
    }, []);

    const startCalibration = async () => {
        setStatus('running');
        setMessage('Measuring background noise...');
        setDebugInfo('');

        try {
            // 1. Init Mic if needed
            if (!micRef.current) {
                micRef.current = new MicrophoneManager();
            }
            // Mute volume for calibration
            await micRef.current.start(deviceId);

            if (!micRef.current.context) throw new Error("No Audio Context");

            // 2. Measure Noise Floor
            let maxNoise = 0;
            const startNoise = Date.now();
            while (Date.now() - startNoise < 500) {
                const v = micRef.current.getCurrentVolume();
                if (v > maxNoise) maxNoise = v;
                await new Promise(r => setTimeout(r, 20));
            }

            const threshold = Math.max(0.04, maxNoise * 4.0);
            setMessage(`Threshold set to ${(threshold * 100).toFixed(1)}%. Starting beeps...`);
            await new Promise(r => setTimeout(r, 500));

            const samples: number[] = [];
            let failures = 0;
            let lastPeak = 0;

            // Run 3 times
            for (let i = 0; i < 3; i++) {
                setMessage(`Testing ${i + 1}/3...`);
                // Short wait before beep
                await new Promise(r => setTimeout(r, 200));

                const result = await measureOneSample(micRef.current, threshold);

                if (result.found) {
                    samples.push(result.latency);
                } else {
                    failures++;
                    lastPeak = result.peak;
                }

                // Wait between beeps
                await new Promise(r => setTimeout(r, 800));
            }

            micRef.current.stop();
            micRef.current = null; // Clear ref to stop meter affecting next run state potentially

            if (failures > 0) {
                setStatus('failed');
                setMessage(`Failed to detect ${failures}/3 beeps.`);
                setDebugInfo(`Last Peak: ${(lastPeak * 100).toFixed(1)}% vs Threshold: ${(threshold * 100).toFixed(1)}%\nTry increasing speaker volume.`);
                return;
            }

            // Validate
            const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
            const maxDev = Math.max(...samples.map(s => Math.abs(s - avg)));

            if (maxDev > 40) { // Tolerance +/- 40ms
                setStatus('failed');
                setMessage(`Inconsistent results. Variance: ${Math.round(maxDev)}ms. Try again.`);
            } else {
                setStatus('success');
                setMessage(`Calibration Complete! Latency: ${Math.round(avg)}ms`);
                onComplete(Math.round(avg));
            }

        } catch (err: any) {
            console.error(err);
            setStatus('failed');
            setMessage('Error: ' + err.message);
            if (micRef.current) {
                micRef.current.stop();
                micRef.current = null;
            }
        }
    };

    const measureOneSample = (mic: MicrophoneManager, threshold: number): Promise<{ found: boolean, latency: number, peak: number }> => {
        return new Promise((resolve, reject) => {
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
