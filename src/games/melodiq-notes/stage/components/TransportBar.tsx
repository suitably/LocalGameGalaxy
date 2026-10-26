import { IconButton, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExitRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import PianoIcon from '@mui/icons-material/PianoRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import QueueMusicIcon from '@mui/icons-material/QueueMusicRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import type { StageDisplay } from '../render/stageRenderer';
import { BackingMenu } from './BackingMenu';
import { FirstNoteButton, SeekBar } from './SeekBar';
import { SpeedButton } from './SpeedButton';

interface TransportBarProps {
  engine: StageEngine;
  display: StageDisplay;
  onDisplay: (d: StageDisplay) => void;
  onTogglePause: () => void;
  fullscreen: { active: boolean; enter: () => void; exit: () => void };
}

const VIEWS = [
  { value: 'instrument', Icon: PianoIcon, label: 'view_instrument' },
  { value: 'notation', Icon: QueueMusicIcon, label: 'view_notation' },
] as const;

/**
 * Player controls in one row, like a video or music player: play/pause, timeline, first note,
 * speed, view, backing and full screen. The same bar floats over the stage in full screen.
 */
export function TransportBar({
  engine,
  display,
  onDisplay,
  onTogglePause,
  fullscreen,
}: TransportBarProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const playing = engine.state === 'playing';
  const running = playing || engine.state === 'paused';
  const playLabel = playing ? k('pause') : running ? k('resume') : k('start');
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap columnGap={0.5}>
      <IconButton
        aria-label={playLabel}
        disabled={!engine.players.length}
        onClick={onTogglePause}
        sx={{
          width: TOUCH_TARGET,
          height: TOUCH_TARGET,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </IconButton>
      <FirstNoteButton engine={engine} />
      <SeekBar engine={engine} />
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto' }}>
        <SpeedButton engine={engine} />
        <BackingMenu engine={engine} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={display}
          aria-label={k('display')}
          onChange={(_, v: StageDisplay | null) => v && onDisplay(v)}
        >
          {VIEWS.map(({ value, Icon, label }) => (
            <ToggleButton key={value} value={value} aria-label={k(label)}>
              <Tooltip title={k(label)}>
                <Icon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Tooltip title={fullscreen.active ? k('exit_fullscreen') : k('fullscreen')}>
          <IconButton
            aria-label={fullscreen.active ? k('exit_fullscreen') : k('fullscreen')}
            onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}
            sx={{ width: TOUCH_TARGET, height: TOUCH_TARGET }}
          >
            {fullscreen.active ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
