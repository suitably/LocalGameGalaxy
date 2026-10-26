/**
 * Input latency of this pult: calibrate with the stage's beep, or set by hand [ID: GAME-MELODIQ-NOTES-PULT-LATENCY-DIALOG]
 *
 * Reuses the shared beep calibrator (`modules/audio/latency`): the stage sounds the beep, this
 * device's microphone hears it; half the clock round trip is taken off (see `beepLatencyMs`).
 */
import React, { useCallback } from 'react';
import { DialogContent, Slider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { MicrophoneManager } from '../../../../modules/audio';
import { detectBeep, LatencyCalibratorPanel } from '../../../../modules/audio/latency';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { beepLatencyMs, MAX_INPUT_LATENCY_MS } from '../logic/clockSync';

interface PultLatencyDialogProps {
  open: boolean;
  onClose: () => void;
  latencyMs: number;
  onChange: (ms: number) => void;
  /** Round trip to the stage (ms), null before the clock is synced. */
  rttMs: number | null;
  requestBeep: () => void;
}

export const PultLatencyDialog: React.FC<PultLatencyDialogProps> = ({
  open,
  onClose,
  latencyMs,
  onChange,
  rttMs,
  requestBeep,
}) => {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.pult.${key}`, opts);
  const rtt = rttMs ?? 0;
  const measure = useCallback(
    async (mic: MicrophoneManager, threshold: number) => {
      const sample = detectBeep(mic, threshold, {
        startDelayMs: 10,
        minElapsedMs: 20,
        latencyOffsetMs: 0,
      });
      requestBeep();
      const s = await sample;
      return { ...s, latency: beepLatencyMs(s.latency, rtt) };
    },
    [requestBeep, rtt],
  );

  return (
    <NotesDialogFrame open={open} onClose={onClose} title={k('latency_title')} maxWidth="xs">
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {k('latency_hint')}
          </Typography>
          <Stack spacing={0.5}>
            <Typography variant="body2" id="pult-latency-label">
              {k('latency_value', { ms: latencyMs })}
            </Typography>
            <Slider
              aria-labelledby="pult-latency-label"
              min={0}
              max={MAX_INPUT_LATENCY_MS}
              step={5}
              value={latencyMs}
              onChange={(_, v) => onChange(v as number)}
            />
          </Stack>
          {rttMs === null ? (
            <Typography variant="caption" color="text.secondary">
              {k('clock_pending')}
            </Typography>
          ) : (
            <LatencyCalibratorPanel deviceId="" onComplete={onChange} measureOneSample={measure} />
          )}
        </Stack>
      </DialogContent>
    </NotesDialogFrame>
  );
};
