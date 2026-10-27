import React, { useCallback, useRef, useState } from 'react';
import { Alert, Box, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { bpmAt } from '../../modules/music-score';
import { DEMO_SONGS } from './demoSongs';
import { useMelodiqNotesHeader } from './hooks/useMelodiqNotesHeader';
import { useStage, useStageTexts } from './stage/useStage';
import { useStageSong } from './stage/useStageSong';
import { useStageInput } from './stage/useStageInput';
import { useFullscreen } from './stage/useFullscreen';
import { StageCanvas } from './stage/components/StageCanvas';
import { StageOverlay } from './stage/components/StageOverlay';
import { TransportBar } from './stage/components/TransportBar';
import { SessionBar } from './stage/components/SessionBar';
import { SectionStrip } from './stage/components/SectionStrip';
import { SongPicker } from './stage/components/SongPicker';
import type { StageDisplay } from './stage/render/stageRenderer';
import { StageInvite } from './pult/components/StageInvite';
import { playCalibrationClicks } from './stage/engine/calibrationClicks';

/** Melodiq Notes: learn and play songs on keyboard, guitar, bass, drums, ukulele or voice, alone or as a band. */
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
  // null until first opened: the room only exists once someone is invited
  const [inviteOpen, setInviteOpen] = useState<boolean | null>(null);
  const [removeRemote, setRemoveRemote] = useState<((id: string) => void) | null>(null);
  const onRoom = useCallback((remove: (id: string) => void) => setRemoveRemote(() => remove), []);
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const scheduleClicks = useCallback(async () => {
    unlockAudio();
    return playCalibrationClicks(engine);
  }, [engine, unlockAudio]);
  const stageRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(stageRef);
  const portrait = useMediaQuery('(orientation: portrait)');

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const song = engine.song;
  useMelodiqNotesHeader({
    currentTitle: song?.title ?? null,
    currentArtist: song?.artist ?? null,
    effectiveBpm: song ? Math.round(bpmAt(song.tempoMap, 0) * engine.speed) : 0,
    onOpenSongSelect: openPicker,
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

  const rotate = fullscreen.active && portrait && engine.players.length > 1;
  const transport = (
    <TransportBar
      engine={engine}
      display={display}
      onDisplay={setDisplay}
      onTogglePause={togglePause}
      fullscreen={{
        active: fullscreen.active,
        enter: () => void fullscreen.enter(),
        exit: fullscreen.exit,
      }}
    />
  );
  return (
    <GameLayout maxWidth="lg" disablePadding>
      <Stack spacing={1.5} sx={{ p: { xs: 1, sm: 2 } }}>
        <SessionBar
          engine={engine}
          songState={songState}
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
        />
        {songState.error && !pickerOpen && (
          <Alert severity="error" onClose={songState.clearError}>
            {k('action_error', { error: songState.error })}
          </Alert>
        )}
        <Paper
          ref={stageRef}
          variant="outlined"
          sx={{
            position: fullscreen.covering ? 'fixed' : 'relative',
            inset: fullscreen.covering ? 0 : undefined,
            zIndex: fullscreen.covering ? 1300 : undefined,
            height: fullscreen.active ? '100dvh' : 'clamp(340px, 62dvh, 600px)',
            borderRadius: fullscreen.active ? 0 : 3,
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}
        >
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
                  bottom: 72,
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
            {fullscreen.active && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  right: 8,
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  px: 1,
                  py: 0.5,
                  opacity: 0.7,
                  transition: 'opacity 0.2s',
                  '&:hover, &:focus-within': { opacity: 1 },
                }}
              >
                {transport}
              </Box>
            )}
          </StageCanvas>
        </Paper>
        {!fullscreen.active && transport}
        <SectionStrip engine={engine} />
      </Stack>
      <SongPicker open={pickerOpen} onClose={() => setPickerOpen(false)} state={songState} />
      {inviteOpen !== null && (
        <StageInvite
          engine={engine}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onRoom={onRoom}
        />
      )}
    </GameLayout>
  );
};
