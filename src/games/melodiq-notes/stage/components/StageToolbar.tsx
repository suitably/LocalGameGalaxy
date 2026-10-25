import { Button, Slider, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import { snapSpeed, SPEED_MAX, SPEED_MIN, SPEED_STEP } from '../logic/tuning';
import type { BandMode, StageMode } from '../engine/types';
import type { StageDisplay } from '../render/stageRenderer';

interface StageToolbarProps {
  engine: StageEngine;
  display: StageDisplay;
  onDisplay: (d: StageDisplay) => void;
  onTogglePause: () => void;
  onFullscreen: () => void;
}

const BAND_MODES: BandMode[] = ['all', 'others', 'none'];

export function StageToolbar({
  engine,
  display,
  onDisplay,
  onTogglePause,
  onFullscreen,
}: StageToolbarProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const running = engine.state === 'playing' || engine.state === 'paused';
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
      <ToggleButtonGroup
        size="small"
        exclusive
        value={engine.mode}
        aria-label={k('mode')}
        onChange={(_, v: StageMode | null) => v && engine.setMode(v)}
      >
        {(['learn', 'practice', 'perform'] as const).map((m) => (
          <ToggleButton key={m} value={m}>
            {k(`modes.${m}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {k('speed')}
        </Typography>
        <Slider
          size="small"
          aria-label={k('speed')}
          value={engine.speed}
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          disabled={engine.mode === 'perform'}
          onChange={(_, v) => engine.setSpeed(snapSpeed(v as number))}
          sx={{ width: 120 }}
        />
        <Typography variant="body2" sx={{ fontFamily: 'monospace', minWidth: '5ch' }}>
          {Math.round(engine.speed * 100)} %
        </Typography>
      </Stack>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={display}
        aria-label={k('display')}
        onChange={(_, v: StageDisplay | null) => v && onDisplay(v)}
      >
        <ToggleButton value="instrument">{k('view_instrument')}</ToggleButton>
        <ToggleButton value="notation">{k('view_notation')}</ToggleButton>
      </ToggleButtonGroup>
      {engine.recording ? (
        <ToggleButton
          size="small"
          value="recording"
          selected={engine.recordingAudible}
          onChange={() => engine.setRecordingAudible(!engine.recordingAudible)}
        >
          {engine.recordingAudible ? k('recording_on') : k('recording_off')}
        </ToggleButton>
      ) : (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={engine.band}
          aria-label={k('backing')}
          onChange={(_, v: BandMode | null) => v && engine.setBand(v)}
        >
          {BAND_MODES.map((m) => (
            <ToggleButton key={m} value={m}>
              {k(`backing_${m}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={!engine.players.length}
          onClick={onTogglePause}
        >
          {engine.state === 'playing' ? k('pause') : running ? k('resume') : k('start')}
        </Button>
        <Button size="small" variant="outlined" onClick={onFullscreen}>
          {k('fullscreen')}
        </Button>
      </Stack>
    </Stack>
  );
}
