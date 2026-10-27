import { useState, type ReactNode } from 'react';
import { Box, Button, Stack } from '@mui/material';
import GroupIcon from '@mui/icons-material/GroupRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import { NotesSheet } from '../../components/NotesSheet';
import type { StageEngine } from '../engine/StageEngine';
import type { StageInputSource } from '../useStageInput';
import { InputMenu } from './InputMenu';
import { PlayerList } from './PlayerList';
import { ModeSwitch } from './ModeSwitch';

interface SessionBarProps {
  engine: StageEngine;
  input: {
    source: StageInputSource;
    midiCount: number;
    /** The connected instrument MIDI listens on. */
    midiName: string | null;
    /** An instrument that disappeared and has sent nothing since. */
    midiLost: string | null;
    midiSound: boolean;
    setMidiSound: (on: boolean) => void;
    choose: (s: StageInputSource) => void;
  };
  scheduleClicks: () => Promise<number[] | null>;
  onInvite: () => void;
  onRemoveRemote: ((remoteId: string) => void) | null;
  /** Before the controls while the app header is hidden: the song. */
  lead?: ReactNode;
  /** After them: the recording. */
  trail?: ReactNode;
}

const chipSx = { minHeight: TOUCH_TARGET, textTransform: 'none' } as const;

/**
 * The stage's top bar: what is set once per session (mode, input with its latency, players).
 * One row that scrolls sideways when it does not fit; players open in a side sheet so the stage
 * stays in view. The song and its recording live in the app header, or in `lead` / `trail`
 * while the header is hidden.
 */
export function SessionBar(props: SessionBarProps) {
  const { engine, input, scheduleClicks, onInvite, onRemoveRemote, lead, trail } = props;
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [playersOpen, setPlayersOpen] = useState(false);
  const song = engine.song;

  // while the header is hidden its items (song, recording) take a row of their own on phones
  const headerItems = (lead || trail) && (
    <Stack direction="row" alignItems="center" gap={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      {lead}
      <Box sx={{ flex: 1, display: { sm: 'none' } }} />
      <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>{trail}</Box>
    </Stack>
  );
  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ px: 1, py: 0.75 }}>
      {headerItems}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ flex: 1, minWidth: 0, overflowX: 'auto', '& > *': { flexShrink: 0 } }}
      >
        <ModeSwitch engine={engine} />
        <InputMenu
          engine={engine}
          source={input.source}
          midiCount={input.midiCount}
          midiName={input.midiName}
          midiLost={input.midiLost}
          midiSound={input.midiSound}
          onMidiSound={input.setMidiSound}
          onChange={input.choose}
          schedule={scheduleClicks}
        />
        {song && (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<GroupIcon />}
            aria-label={k('players_count', { count: engine.seats.length })}
            onClick={() => setPlayersOpen(true)}
            sx={chipSx}
          >
            <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
              {engine.seats.length}
            </Box>
            <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
              {k('players_count', { count: engine.seats.length })}
            </Box>
          </Button>
        )}
      </Stack>
      {trail && <Box sx={{ display: { xs: 'none', sm: 'flex' } }}>{trail}</Box>}
      <NotesSheet
        open={playersOpen}
        onClose={() => setPlayersOpen(false)}
        title={k('players_title')}
        subtitle={
          song
            ? `${song.artist ? `${song.artist} · ` : ''}${k('song_meta', { bars: song.measureStarts.length, parts: song.parts.length })}`
            : undefined
        }
      >
        <PlayerList engine={engine} onInvite={onInvite} onRemoveRemote={onRemoveRemote} />
      </NotesSheet>
    </Stack>
  );
}
