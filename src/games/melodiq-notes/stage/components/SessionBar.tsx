import { useState } from 'react';
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded';
import GroupIcon from '@mui/icons-material/GroupRounded';
import GraphicEqIcon from '@mui/icons-material/GraphicEqRounded';
import { useTranslation } from 'react-i18next';
import { TOUCH_TARGET } from '../../../../lib/touchTarget';
import { NotesSheet } from '../../components/NotesSheet';
import type { StageEngine } from '../engine/StageEngine';
import type { StageMode } from '../engine/types';
import { recordingStatus } from '../logic/recordingStatus';
import type { StageInputSource } from '../useStageInput';
import type { StageSongState } from '../useStageSong';
import { InputMenu } from './InputMenu';
import { PlayerList } from './PlayerList';
import { RecordingPanel } from './RecordingPanel';

interface SessionBarProps {
  engine: StageEngine;
  songState: StageSongState;
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
}

type Sheet = 'players' | 'recording' | null;
const MODES: StageMode[] = ['learn', 'practice', 'perform'];
const chipSx = { minHeight: TOUCH_TARGET, textTransform: 'none' } as const;

/**
 * What is set once per session, above the stage: mode, input with its latency, players and the
 * recording. Players and recording open in a side sheet so the stage stays in view.
 */
export function SessionBar(props: SessionBarProps) {
  const { engine, songState, input, scheduleClicks, onInvite, onRemoveRemote } = props;
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [sheet, setSheet] = useState<Sheet>(null);
  const song = engine.song;
  const several = engine.players.length > 1;
  const rec = recordingStatus(!!songState.recording, songState.align, !!songState.marks);
  const recLabel =
    rec.kind === 'running'
      ? k('rec_chip_running', { percent: rec.percent })
      : k(`rec_chip_${rec.kind}`);

  return (
    <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
      <ToggleButtonGroup
        exclusive
        value={engine.mode}
        aria-label={k('mode')}
        onChange={(_, v: StageMode | null) => v && engine.setMode(v)}
        sx={{
          width: { xs: '100%', sm: 'auto' },
          '& .MuiToggleButton-root': {
            minHeight: TOUCH_TARGET,
            px: 1.5,
            flex: { xs: 1, sm: 'none' },
          },
        }}
      >
        {MODES.map((m) => (
          <ToggleButton
            key={m}
            value={m}
            // learn mode waits for its player: for practising alone
            disabled={m === 'learn' && several}
            title={m === 'learn' && several ? k('learn_solo') : undefined}
          >
            {k(`modes.${m}`)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box sx={{ flex: '1 1 0', display: { xs: 'none', md: 'block' } }} />
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
          onClick={() => setSheet('players')}
          sx={chipSx}
        >
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            {engine.seats.length}
          </Box>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {k('players_count', { count: engine.seats.length })}
          </Box>
        </Button>
      )}
      <Button
        variant="outlined"
        color={rec.kind === 'failed' ? 'error' : rec.kind === 'aligned' ? 'primary' : 'inherit'}
        startIcon={rec.kind === 'failed' ? <ErrorIcon /> : <GraphicEqIcon />}
        onClick={() => setSheet('recording')}
        sx={chipSx}
      >
        {recLabel}
      </Button>
      <NotesSheet
        open={sheet === 'players'}
        onClose={() => setSheet(null)}
        title={k('players_title')}
        subtitle={
          song
            ? `${song.artist ? `${song.artist} · ` : ''}${k('song_meta', { bars: song.measureStarts.length, parts: song.parts.length })}`
            : undefined
        }
      >
        <PlayerList engine={engine} onInvite={onInvite} onRemoveRemote={onRemoveRemote} />
      </NotesSheet>
      <NotesSheet
        open={sheet === 'recording'}
        onClose={() => setSheet(null)}
        title={k('audio_title')}
      >
        <RecordingPanel state={songState} />
      </NotesSheet>
    </Stack>
  );
}
