import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { MicrophoneManager } from '../audio/MicrophoneManager';

interface LatencyCalibratorProps {
    onComplete: (latencyMs: number) => void;
    deviceId: string;
}

export const LatencyCalibrator: React.FC<LatencyCalibratorProps> = ({ onComplete, deviceId }) => {
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
            await micRef.current.start(deviceId, 0, true);

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
            const ctx = mic.context;
            if (!ctx) return reject("No Context");

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);

            // Short loud beep
            const startTime = ctx.currentTime + 0.1;
            osc.start(startTime);
            osc.stop(startTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.setValueAtTime(0.8, startTime); // Louder beep (0.8)
            gain.gain.setValueAtTime(0, startTime + 0.1);

            const checkStart = Date.now();
            let detected = false;
            let peakVol = 0;

            const loop = () => {
                if (detected) return;
                const vol = mic.getCurrentVolume();
                if (vol > peakVol) peakVol = vol;

                const elapsed = Date.now() - checkStart;

                if (vol > threshold && elapsed > 80) {
                    // We emitted at T+100ms.
                    // We detected at T_now ( elapsed since checkStart ).
                    // checkStart was roughly concurrent with T_now 0? No, checkStart is Date.now().
                    // startTime is ctx.time + 0.1.
                    // The logic "elapsed - 100" assumes checkStart/Date.now aligns with ctx.currentTime.
                    // Roughly yes for local.
                    resolve({ found: true, latency: elapsed - 100, peak: peakVol });
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
            setTimeout(loop, 90);
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
