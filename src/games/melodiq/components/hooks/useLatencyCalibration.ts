import { useState, useRef, useEffect, useCallback } from 'react';
import { MicrophoneManager } from '../../audio/MicrophoneManager';

export function useLatencyCalibration(
    deviceId: string,
    onComplete: (latencyMs: number) => void,
    measureOneSample: (mic: MicrophoneManager, threshold: number) => Promise<{ found: boolean, latency: number, peak: number }>
) {
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

    const startCalibration = useCallback(async () => {
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
    }, [deviceId, onComplete, measureOneSample]);

    return {
        status,
        message,
        volume,
        debugInfo,
        startCalibration
    };
}
