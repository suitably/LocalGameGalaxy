/**
 * Calibration UI shared by the local and the phone latency calibrator [ID: COMP-MELODIQ-LATENCY-PANEL]
 *
 * The caller decides how a beep is played and measured (`measureOneSample`).
 */
import React from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MicrophoneManager } from '../audio/MicrophoneManager';
import { useLatencyCalibration } from './hooks/useLatencyCalibration';
import type { BeepSample } from './hooks/detectBeep';

interface LatencyCalibratorPanelProps {
  deviceId: string;
  onComplete: (latencyMs: number) => void;
  measureOneSample: (mic: MicrophoneManager, threshold: number) => Promise<BeepSample>;
}

export const LatencyCalibratorPanel: React.FC<LatencyCalibratorPanelProps> = ({
  deviceId,
  onComplete,
  measureOneSample,
}) => {
  const { t } = useTranslation();
  const { status, message, volume, debugInfo, startCalibration } = useLatencyCalibration(
    deviceId,
    onComplete,
    measureOneSample,
  );
  const running = status === 'running';

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{
            width: '100%',
            height: 4,
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${Math.min(100, volume * 300)}%`,
              height: '100%',
              bgcolor: volume > 0.1 ? 'success.light' : 'warning.light',
              transition: 'width 0.1s',
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.7 }}>
          {t('melodiq.calibrator.mic_level', 'Mic Input Level')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={startCalibration}
          disabled={running}
          sx={{
            borderRadius: 50,
            px: 3,
            py: 1,
            backgroundImage: running ? 'none' : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
            boxShadow: running ? 'none' : '0 3px 5px 2px rgba(255, 105, 135, .3)',
            color: 'white',
          }}
        >
          {running
            ? t('melodiq.calibrator.calibrating', 'Calibrating...')
            : t('melodiq.calibrator.auto', 'Auto Calibrate')}
        </Button>
        {running && <CircularProgress size={20} />}
      </Box>

      <Typography variant="caption" display="block">
        {message}
      </Typography>
      {debugInfo && (
        <Typography
          variant="caption"
          display="block"
          color="error"
          sx={{ whiteSpace: 'pre-wrap', mt: 1 }}
        >
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
