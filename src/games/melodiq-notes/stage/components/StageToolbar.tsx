import { Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { StageEngine } from '../engine/StageEngine';
import type { StageMode } from '../engine/types';
import type { StageDisplay } from '../render/stageRenderer';

interface StageToolbarProps {
  engine: StageEngine;
  display: StageDisplay;
  onDisplay: (d: StageDisplay) => void;
  onTogglePause: () => void;
  onFullscreen: () => void;
}

const SPEEDS = [0.5, 0.75, 1];

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
      <ToggleButtonGroup
        size="small"
        exclusive
        value={engine.speed}
        aria-label={k('speed')}
        disabled={engine.mode === 'perform'}
        onChange={(_, v: number | null) => v && engine.setSpeed(v)}
      >
        {SPEEDS.map((s) => (
          <ToggleButton key={s} value={s}>
            {Math.round(s * 100)} %
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
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
      <ToggleButton
        size="small"
        value="band"
        selected={engine.band}
        onChange={() => engine.setBand(!engine.band)}
      >
        {engine.band ? k('band_on') : k('band_off')}
      </ToggleButton>
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
