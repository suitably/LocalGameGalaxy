import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Box, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { bpmAt } from '../../modules/music-score';
import { DEMO_SONGS } from './demoSongs';
import { NotesSheet } from './components/NotesSheet';
import { useMelodiqNotesHeader } from './hooks/useMelodiqNotesHeader';
import { useStage, useStageTexts } from './stage/useStage';
import { useStageSong } from './stage/useStageSong';
import { useStageInput } from './stage/useStageInput';
import { useImmersive } from './stage/useImmersive';
import { StageCanvas } from './stage/components/StageCanvas';
import { StageOverlay } from './stage/components/StageOverlay';
import { TransportBar } from './stage/components/TransportBar';
import { SessionBar } from './stage/components/SessionBar';
import { SectionStrip } from './stage/components/SectionStrip';
import { SongPicker } from './stage/components/SongPicker';
import { RecordingPanel } from './stage/components/RecordingPanel';
import { RecordingButton, RecordingIcon } from './stage/components/RecordingIcon';
import { useRecordingStatus } from './stage/useRecordingStatus';
import { ImmersiveSong } from './stage/components/ImmersiveSong';
import type { StageDisplay } from './stage/render/stageRenderer';
import { StageInvite } from './pult/components/StageInvite';
import { playCalibrationClicks } from './stage/engine/calibrationClicks';

/**
 * Melodiq Notes: learn and play songs on keyboard, guitar, bass, drums, ukulele or voice, alone or
 * as a band. One frame fills the screen like a player app: session settings on top, the stage in
 * the middle, transport docked below; the song and its recording sit in the app header.
 */
export const MelodiqNotesGame: React.FC = () => {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { engine, unlockAudio } = useStage();
  const texts = useStageTexts();
  const songState = useStageSong(engine, {
    title: DEMO_SONGS[0].title,
    xml: DEMO_SONGS[0].xmlContent,
  });
  const input = useStageInput(engine);
  const [display, setDisplay] = useState<StageDisplay>('instrument');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [barsOpen, setBarsOpen] = useState(false);
  // null until first opened: the room only exists once someone is invited
  const [inviteOpen, setInviteOpen] = useState<boolean | null>(null);
  const [removeRemote, setRemoveRemote] = useState<((id: string) => void) | null>(null);
  const onRoom = useCallback((remove: (id: string) => void) => setRemoveRemote(() => remove), []);
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const scheduleClicks = useCallback(async () => {
    unlockAudio();
    return playCalibrationClicks(engine);
  }, [engine, unlockAudio]);
  const immersive = useImmersive();
  const portrait = useMediaQuery('(orientation: portrait)');

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const openRecording = useCallback(() => setRecordingOpen(true), []);
  const recording = useRecordingStatus(songState);
  const recordingIcon = useMemo(
    () => <RecordingIcon status={recording.status} />,
    [recording.status],
  );
  const song = engine.song;
  useMelodiqNotesHeader({
    currentTitle: song?.title ?? null,
    currentArtist: song?.artist ?? null,
    effectiveBpm: song ? Math.round(bpmAt(song.tempoMap, 0) * engine.speed) : 0,
    onOpenSongSelect: openPicker,
    recording: {
      label: recording.label,
      icon: recordingIcon,
      onOpen: openRecording,
    },
  });

  const start = useCallback(() => {
    unlockAudio();
    engine.start();
  }, [engine, unlockAudio]);
  const togglePause = useCallback(() => {
    if (engine.state === 'playing') engine.pause();
    else start();
  }, [engine, start]);
  const practise = useCallback(
    (section: number) => {
      // the weakest bar and the one after it
      engine.setLoop(section, Math.min(section + 1, engine.sections.length - 1));
      engine.setSpeed(0.75);
      start();
    },
    [engine, start],
  );

  const rotate = immersive.active && portrait && engine.players.length > 1;
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        width: '100%',
        maxWidth: immersive.active ? 'none' : 1200,
        mx: 'auto',
        p: immersive.active ? 0 : { xs: 0, sm: 1.5 },
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden',
          // a framed window on larger screens, edge to edge on phones and when immersive
          border: immersive.active ? 0 : { xs: 0, sm: 1 },
          borderColor: 'divider',
          borderRadius: immersive.active ? 0 : { xs: 0, sm: 3 },
        }}
      >
        <SessionBar
          engine={engine}
          input={{
            source: input.source,
            midiCount: input.midiDevices.length,
            midiName: input.midiName,
            midiLost: input.midiLost,
            midiSound: input.midiSound,
            setMidiSound: input.setMidiSound,
            choose: input.choose,
          }}
          scheduleClicks={scheduleClicks}
          onInvite={openInvite}
          onRemoveRemote={removeRemote}
          lead={
            immersive.active && (
              <ImmersiveSong title={song?.title ?? k('song_pick')} onPick={openPicker} />
            )
          }
          trail={immersive.active && <RecordingButton state={songState} onOpen={openRecording} />}
        />
        {songState.error && !pickerOpen && (
          <Alert severity="error" onClose={songState.clearError} sx={{ mx: 1, mb: 1 }}>
            {k('action_error', { error: songState.error })}
          </Alert>
        )}
        <Box sx={{ flex: 1, minHeight: 120, position: 'relative' }}>
          <StageCanvas
            engine={engine}
            display={display}
            texts={texts}
            onGesture={unlockAudio}
            onTogglePause={togglePause}
          >
            <StageOverlay engine={engine} onStart={start} onPractise={practise} />
            {rotate && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'background.paper',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {k('rotate_hint')}
              </Typography>
            )}
          </StageCanvas>
        </Box>
        <Box sx={{ px: 1, py: 0.5, borderTop: 1, borderColor: 'divider' }}>
          <SectionStrip engine={engine} open={barsOpen} />
          <TransportBar
            engine={engine}
            display={display}
            onDisplay={setDisplay}
            onTogglePause={togglePause}
            fullscreen={{
              active: immersive.requested,
              enter: () => void immersive.enter(),
              exit: immersive.exit,
            }}
            bars={{ open: barsOpen, toggle: () => setBarsOpen((o) => !o) }}
          />
        </Box>
      </Box>
      <SongPicker open={pickerOpen} onClose={() => setPickerOpen(false)} state={songState} />
      <NotesSheet
        open={recordingOpen}
        onClose={() => setRecordingOpen(false)}
        title={k('audio_title')}
      >
        <RecordingPanel state={songState} />
      </NotesSheet>
      {inviteOpen !== null && (
        <StageInvite
          engine={engine}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onRoom={onRoom}
        />
      )}
    </Box>
  );
};
