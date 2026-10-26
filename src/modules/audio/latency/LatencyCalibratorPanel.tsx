/**
 * Latency calibration UI: mic level, start button, result [ID: MOD-AUDIO-LATENCY-PANEL]
 *
 * The caller decides how a beep is played and measured (`measureOneSample`); used by Melodiq
 * (this device, phone via host) and Melodiq Notes (pult via stage).
 */
import React from 'react';
import { alpha, Box, Button, Typography, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MicrophoneManager } from '../MicrophoneManager';
import { useLatencyCalibration } from './useLatencyCalibration';
import type { BeepSample } from './detectBeep';

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
    <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
      <Box sx={{ mb: 1 }}>
        <Box
          sx={{
            width: '100%',
            height: 4,
            bgcolor: (theme) => alpha(theme.palette.text.primary, 0.1),
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
        <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.7 }}>
          {t('latencyCalibrator.mic_level')}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={startCalibration}
          disabled={running}
          sx={{
            borderRadius: 999,
            px: 3,
            py: 1,
          }}
        >
          {running ? t('latencyCalibrator.calibrating') : t('latencyCalibrator.auto')}
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
          {t('latencyCalibrator.requires_speakers')}
        </Typography>
      )}
    </Box>
  );
};
