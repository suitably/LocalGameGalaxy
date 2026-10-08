import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { useLatencyCalibration } from './hooks/useLatencyCalibration';

interface LatencyCalibratorProps {
    onComplete: (latencyMs: number) => void;
    deviceId: string;
}

export const LatencyCalibrator: React.FC<LatencyCalibratorProps> = ({ onComplete, deviceId }) => {
    const { t } = useTranslation();

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

    const { status, message, volume, debugInfo, startCalibration } = useLatencyCalibration(deviceId, onComplete, measureOneSample);

    return (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
            <Box sx={{ mb: 1 }}>
                {/* Volume Meter */}
                <Box sx={{ width: '100%', height: 4, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.min(100, volume * 300)}%`, height: '100%', bgcolor: volume > 0.1 ? '#4caf50' : '#ffa726', transition: 'width 0.1s' }} />
                </Box>
                <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>{t('melodiq.calibrator.mic_level', 'Mic Input Level')}</Typography>
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
                    {status === 'running' ? t('melodiq.calibrator.calibrating', 'Calibrating...') : t('melodiq.calibrator.auto', 'Auto Calibrate')}
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
                    {t('melodiq.calibrator.requires_speakers', 'Requires speakers on. Plays sounds.')}
                </Typography>
            )}
        </Box>
    );
};
