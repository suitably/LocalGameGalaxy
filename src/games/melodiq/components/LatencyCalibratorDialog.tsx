import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    LinearProgress,
    Alert
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import MicIcon from '@mui/icons-material/Mic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useTranslation } from 'react-i18next';
import { useMelodiqSettings } from '../hooks/SettingsContext';

interface LatencyCalibratorDialogProps {
    open: boolean;
    onClose: () => void;
}

export const LatencyCalibratorDialog: React.FC<LatencyCalibratorDialogProps> = ({ open, onClose }) => {
    const { t } = useTranslation();
    const { updateSetting } = useMelodiqSettings();

    const [isCalibrating, setIsCalibrating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [detectedLatency, setDetectedLatency] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isCancelledRef = useRef(false);

    const stopAll = () => {
        isCancelledRef.current = true;
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        setIsCalibrating(false);
    };

    useEffect(() => {
        if (!open) {
            stopAll();
            setDetectedLatency(null);
            setProgress(0);
            setError(null);
        }
    }, [open]);

    const runCalibration = async () => {
        setIsCalibrating(true);
        setProgress(0);
        setDetectedLatency(null);
        setError(null);
        isCancelledRef.current = false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            micStreamRef.current = stream;

            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;

            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }

            const micSource = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            micSource.connect(analyser);

            const buffer = new Float32Array(analyser.fftSize);
            const numBeeps = 4;
            const intervalMs = 600;
            const latencies: number[] = [];

            for (let i = 0; i < numBeeps; i++) {
                if (isCancelledRef.current) break;

                // Play short pulse beep
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime);

                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 0.01);
                gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.05);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                const emissionTimestamp = performance.now();
                osc.start();
                osc.stop(audioCtx.currentTime + 0.06);

                // Sample mic input for peak response within next 450ms
                const startTime = performance.now();
                let peakDetectedTime: number | null = null;
                let maxVolume = 0;

                while (performance.now() - startTime < 450) {
                    if (isCancelledRef.current) break;
                    analyser.getFloatTimeDomainData(buffer);
                    let sumSquares = 0;
                    for (let j = 0; j < buffer.length; j++) {
                        sumSquares += buffer[j] * buffer[j];
                    }
                    const rms = Math.sqrt(sumSquares / buffer.length);
                    if (rms > 0.08 && rms > maxVolume && (performance.now() - emissionTimestamp) > 15) {
                        maxVolume = rms;
                        peakDetectedTime = performance.now();
                    }
                    await new Promise(r => setTimeout(r, 10));
                }

                if (peakDetectedTime) {
                    const sampleLatency = Math.round(peakDetectedTime - emissionTimestamp);
                    if (sampleLatency >= 0 && sampleLatency <= 500) {
                        latencies.push(sampleLatency);
                    }
                }

                setProgress(Math.round(((i + 1) / numBeeps) * 100));
                await new Promise(r => setTimeout(r, intervalMs - 450));
            }

            if (latencies.length > 0) {
                // Average latencies
                const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
                setDetectedLatency(avgLatency);
            } else {
                // Fallback default estimated web latency if mic was too quiet
                setDetectedLatency(80);
            }
        } catch (err: any) {
            console.error('[LatencyCalibrator] Error during calibration:', err);
            setError(err.message || 'Microphone access denied or audio error.');
        } finally {
            stopAll();
        }
    };

    const handleApply = () => {
        if (detectedLatency !== null) {
            updateSetting('micLatency', detectedLatency);
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <SpeedIcon color="primary" />
                {t('games.melodiq.settings.calibrate_latency', 'Audio Latency Calibrator')}
            </DialogTitle>

            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" paragraph>
                    {t('games.melodiq.settings.latency_help', 'Test beeps will be played to measure round-trip audio and microphone processing delay. Ensure your microphone can hear your speakers.')}
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {isCalibrating && (
                    <Box sx={{ my: 3, textAlign: 'center' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            <MicIcon sx={{ verticalAlign: 'middle', mr: 1, animation: 'pulse 1s infinite' }} />
                            {t('games.melodiq.settings.calibrating', 'Calibrating audio latency...')}
                        </Typography>
                        <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, height: 8, borderRadius: 4 }} />
                    </Box>
                )}

                {detectedLatency !== null && !isCalibrating && (
                    <Box sx={{ my: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                        <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">
                            {detectedLatency} ms
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {t('games.melodiq.settings.detected_latency', 'Recommended Microphone Offset')}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    {!isCalibrating && (
                        <Button
                            variant="outlined"
                            startIcon={<SpeedIcon />}
                            onClick={runCalibration}
                        >
                            {detectedLatency !== null ? t('common.retry', 'Recalibrate') : t('games.melodiq.settings.start_test', 'Start Calibration')}
                        </Button>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    {t('common.cancel', 'Cancel')}
                </Button>
                {detectedLatency !== null && (
                    <Button variant="contained" onClick={handleApply}>
                        {t('common.save', 'Apply')} ({detectedLatency} ms)
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
