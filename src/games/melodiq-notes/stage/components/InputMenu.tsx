import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import KeyboardIcon from '@mui/icons-material/KeyboardRounded';
import MicIcon from '@mui/icons-material/MicRounded';
import PianoIcon from '@mui/icons-material/PianoRounded';
import TimerIcon from '@mui/icons-material/TimerOutlined';
import VolumeIcon from '@mui/icons-material/VolumeUpRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import type { StageEngine } from '../engine/StageEngine';
import type { StageInputSource } from '../useStageInput';
import { LatencyControl } from '../../components/LatencyControl';

const ICONS = { keys: KeyboardIcon, midi: PianoIcon, mic: MicIcon } as const;
const SOURCES: StageInputSource[] = ['keys', 'midi', 'mic'];
const sameClock = (ms: number) => ms;

interface InputMenuProps {
  engine: StageEngine;
  source: StageInputSource;
  midiCount: number;
  midiName: string | null;
  /** An instrument that disappeared and has sent nothing since. */
  midiLost: string | null;
  /** Whether MIDI notes sound through the browser (microphone notes never do). */
  midiSound: boolean;
  onMidiSound: (on: boolean) => void;
  onChange: (source: StageInputSource) => void;
  /** Plays the calibration clicks; resolves with their times. */
  schedule: () => Promise<number[] | null>;
}

/** One button for how the stage hears you: input source and its latency ("MIDI · 35 ms"). */
export function InputMenu({
  engine,
  source,
  midiCount,
  midiName,
  midiLost,
  midiSound,
  onMidiSound,
  onChange,
  schedule,
}: InputMenuProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Icon = ICONS[source];
  return (
    <LatencyControl
      engine={engine}
      role="stage"
      source={source}
      schedule={schedule}
      toClock={sameClock}
      canStart
      trigger={(ms, openCalibration) => (
        <>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Icon />}
            endIcon={<ExpandMoreIcon />}
            aria-haspopup="menu"
            aria-label={`${k('input')}: ${k('input_chip', { input: k(`input_${source}`), ms })}`}
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ minHeight: TOUCH_TARGET, textTransform: 'none' }}
          >
            {/* phones show the input only; its latency is in the menu */}
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {k(`input_${source}`)}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {k('input_chip', { input: k(`input_${source}`), ms })}
            </Box>
          </Button>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            {SOURCES.map((s) => {
              const SourceIcon = ICONS[s];
              const disabled = s === 'midi' && !midiCount;
              return (
                <MenuItem
                  key={s}
                  selected={s === source}
                  disabled={disabled}
                  onClick={() => {
                    onChange(s);
                    setAnchor(null);
                  }}
                >
                  <ListItemIcon>
                    <SourceIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={k(`input_${s}`)}
                    secondary={disabled ? k('midi_none') : s === 'midi' ? midiName : undefined}
                  />
                  {s === source && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
                </MenuItem>
              );
            })}
            {midiLost && (
              <Alert severity="warning" sx={{ mx: 1, my: 0.5, maxWidth: 320 }}>
                {k('midi_lost', { name: midiLost })}
              </Alert>
            )}
            {source === 'midi' && (
              <MenuItem onClick={() => onMidiSound(!midiSound)}>
                <ListItemIcon>
                  <VolumeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={k('midi_sound')} />
                <Switch
                  edge="end"
                  size="small"
                  checked={midiSound}
                  tabIndex={-1}
                  inputProps={{ 'aria-label': k('midi_sound') }}
                />
              </MenuItem>
            )}
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchor(null);
                openCalibration();
              }}
            >
              <ListItemIcon>
                <TimerIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={k('latency_calibrate')}
                secondary={t('games.melodiq_notes.latency.button', { ms })}
              />
            </MenuItem>
          </Menu>
        </>
      )}
    />
  );
}
