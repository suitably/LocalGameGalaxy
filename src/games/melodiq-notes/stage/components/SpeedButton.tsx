import { useState } from 'react';
import { Button, Popover, Slider, Stack, Typography } from '@mui/material';
import SpeedIcon from '@mui/icons-material/SpeedRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import { snapSpeed, SPEED_MAX, SPEED_MIN, SPEED_STEP } from '../logic/tuning';
import { overlayContainer } from './overlayContainer';

/** Playback speed as a compact "75 %" button; the slider opens in a popover. Fixed in perform mode. */
export function SpeedButton({ engine }: { engine: StageEngine }) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const percent = Math.round(engine.speed * 100);
  return (
    <>
      <Button
        color={percent === 100 ? 'inherit' : 'primary'}
        startIcon={<SpeedIcon />}
        disabled={engine.mode === 'perform'}
        aria-label={`${k('speed')} ${percent} %`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ minHeight: TOUCH_TARGET, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
      >
        {percent} %
      </Button>
      <Popover
        container={overlayContainer}
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Stack spacing={1} sx={{ p: 2, width: 260 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2">{k('speed')}</Typography>
            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
              {percent} %
            </Typography>
          </Stack>
          <Slider
            aria-label={k('speed')}
            value={engine.speed}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            marks={[{ value: 1 }]}
            onChange={(_, v) => engine.setSpeed(snapSpeed(v as number))}
          />
          <Button size="small" disabled={percent === 100} onClick={() => engine.setSpeed(1)}>
            100 %
          </Button>
        </Stack>
      </Popover>
    </>
  );
}
