import { Button, Slider, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  formatOffsetMs,
  OFFSET_COARSE_SEC,
  OFFSET_FINE_SEC,
  OFFSET_RANGE_SEC,
} from '../logic/tuning';
import type { StageSongState } from '../useStageSong';

const NUDGES = [
  { sec: -OFFSET_COARSE_SEC, label: '−10' },
  { sec: -OFFSET_FINE_SEC, label: '−1' },
  { sec: OFFSET_FINE_SEC, label: '+1' },
  { sec: OFFSET_COARSE_SEC, label: '+10' },
];

/** Shifts the recording against the notes: ±10 ms / ±1 ms buttons around a ±2 s slider. */
export function OffsetControls({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const nudge = (n: (typeof NUDGES)[number]) => (
    <Button
      key={n.sec}
      size="small"
      variant="outlined"
      aria-label={
        n.sec < 0
          ? k('earlier_ms', { ms: Math.abs(n.sec * 1000) })
          : k('later_ms', { ms: n.sec * 1000 })
      }
      onClick={() => state.nudge(n.sec)}
      sx={{ minWidth: 44 }}
    >
      {n.label}
    </Button>
  );
  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1 }}>
        <Slider
          size="small"
          aria-label={k('fine_tune')}
          value={state.offset}
          min={-OFFSET_RANGE_SEC}
          max={OFFSET_RANGE_SEC}
          step={OFFSET_FINE_SEC}
          onChange={(_, v) => state.setOffsetSec(v as number)}
          valueLabelDisplay="auto"
          valueLabelFormat={formatOffsetMs}
        />
        <Typography
          variant="body2"
          sx={{ fontFamily: 'monospace', minWidth: '8ch', textAlign: 'right' }}
        >
          {formatOffsetMs(state.offset)}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="center">
        {NUDGES.map(nudge)}
      </Stack>
    </Stack>
  );
}
