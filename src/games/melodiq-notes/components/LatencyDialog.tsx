/**
 * Input latency of this device for one input source: tap-along calibration or by hand [ID: GAME-MELODIQ-NOTES-LATENCY-DIALOG]
 *
 * Used on the stage (clicks from this device) and on a pult (clicks from the stage). The player
 * taps along with the input they play with: the pad, computer keys, the MIDI instrument or a sung
 * or played note into the microphone.
 */
import React, { useEffect } from 'react';
import { Box, Button, DialogContent, Slider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TapAlongState } from '../../../modules/audio/latency';
import { MAX_INPUT_LATENCY_MS } from '../pult/logic/clockSync';
import { NotesDialogFrame } from './NotesDialogFrame';

interface LatencyDialogProps {
  open: boolean;
  onClose: () => void;
  /** Translated name of the input source the value is for. */
  sourceLabel: string;
  latencyMs: number;
  onChange: (ms: number) => void;
  calibration: { state: TapAlongState; start: () => void; tapNow: () => void };
  /** False while the clicks cannot be played yet (pult clock not synced). */
  canStart: boolean;
  /** Extra line, e.g. the network round trip on a pult. */
  note?: React.ReactNode;
}

function stateText(s: TapAlongState, k: (key: string, o?: Record<string, unknown>) => string) {
  switch (s.kind) {
    case 'idle':
      return k('tap_idle');
    case 'waiting':
      return k('tap_waiting');
    case 'running':
      return k('tap_running', { taps: s.taps });
    case 'no_clicks':
      return k('tap_no_clicks');
    case 'done':
      return s.result.ok
        ? k('tap_done', { ms: s.result.latencyMs, spread: s.result.spreadMs })
        : k(`tap_${s.result.reason}`);
  }
}

export const LatencyDialog: React.FC<LatencyDialogProps> = ({
  open,
  onClose,
  sourceLabel,
  latencyMs,
  onChange,
  calibration,
  canStart,
  note,
}) => {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.latency.${key}`, opts);
  const running = calibration.state.kind === 'running' || calibration.state.kind === 'waiting';
  const { tapNow } = calibration;

  // computer keys tap too while the dialog is open (the stage ignores keys in dialogs)
  useEffect(() => {
    if (!open || !running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.key === 'Escape' || e.key === 'Tab') return;
      e.preventDefault();
      tapNow();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, running, tapNow]);

  return (
    <NotesDialogFrame
      open={open}
      onClose={onClose}
      title={k('title', { source: sourceLabel })}
      maxWidth="xs"
    >
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {k('hint')}
          </Typography>
          <Button variant="contained" onClick={calibration.start} disabled={!canStart || running}>
            {k('start')}
          </Button>
          <Box
            role="button"
            tabIndex={-1}
            aria-label={k('pad')}
            onPointerDown={(e) => {
              e.preventDefault();
              tapNow();
            }}
            sx={{
              height: 120,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              bgcolor: running ? 'primary.main' : 'action.hover',
              color: running ? 'primary.contrastText' : 'text.secondary',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            <Typography fontWeight={700}>{k('pad')}</Typography>
          </Box>
          <Typography variant="body2" aria-live="polite">
            {stateText(calibration.state, k)}
          </Typography>
          {note}
          <Stack spacing={0.5}>
            <Typography variant="body2" id="notes-latency-label">
              {k('value', { ms: latencyMs })}
            </Typography>
            <Slider
              aria-labelledby="notes-latency-label"
              min={0}
              max={MAX_INPUT_LATENCY_MS}
              step={5}
              value={latencyMs}
              onChange={(_, v) => onChange(v as number)}
            />
          </Stack>
        </Stack>
      </DialogContent>
    </NotesDialogFrame>
  );
};
