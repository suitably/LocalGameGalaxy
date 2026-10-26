import React, { useCallback, useRef, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { GameLayout } from '../../components/Layout/GameLayout';
import { bpmAt } from '../../modules/music-score';
import { DEMO_SONGS } from './demoSongs';
import { useMelodiqNotesHeader } from './hooks/useMelodiqNotesHeader';
import { SoundSettingsDialog } from './components/SoundSettingsDialog';
import { useStage, useStageTexts } from './stage/useStage';
import { useStageSong } from './stage/useStageSong';
import { useStageInput } from './stage/useStageInput';
import { useFullscreen } from './stage/useFullscreen';
import { StageCanvas } from './stage/components/StageCanvas';
import { StageOverlay } from './stage/components/StageOverlay';
import { StageToolbar } from './stage/components/StageToolbar';
import { SeekBar } from './stage/components/SeekBar';
import { SectionStrip } from './stage/components/SectionStrip';
import { PlayerList } from './stage/components/PlayerList';
import { RecordingBar } from './stage/components/RecordingBar';
import { SongPicker } from './stage/components/SongPicker';
import { InputSourcePicker } from './stage/components/InputSourcePicker';
import type { StageDisplay } from './stage/render/stageRenderer';
import { StageInvite } from './pult/components/StageInvite';

const noop = () => {};

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  // null until first opened: the room only exists once someone is invited
  const [inviteOpen, setInviteOpen] = useState<boolean | null>(null);
  const [removeRemote, setRemoveRemote] = useState<((id: string) => void) | null>(null);
  const onRoom = useCallback((remove: (id: string) => void) => setRemoveRemote(() => remove), []);
  const openInvite = useCallback(() => setInviteOpen(true), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(stageRef);
  const portrait = useMediaQuery('(orientation: portrait)');

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const song = engine.song;
  useMelodiqNotesHeader({
    currentTitle: song?.title ?? null,
    currentArtist: song?.artist ?? null,
    effectiveBpm: song ? Math.round(bpmAt(song.tempoMap, 0) * engine.speed) : 0,
    partsCount: 0,
    onOpenSongSelect: openPicker,
    onOpenMixer: noop,
    onOpenSettings: openSettings,
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
  return (
    <GameLayout maxWidth="lg" disablePadding>
      <Stack spacing={1.5} sx={{ p: { xs: 1, sm: 2 } }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button variant="outlined" size="small" onClick={openPicker}>
            {k('song_pick')}
          </Button>
          <Button variant="outlined" size="small" onClick={openInvite}>
            {t('games.melodiq_notes.pult.invite')}
          </Button>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
            {song
              ? `${song.artist ? `${song.artist} · ` : ''}${k('song_meta', { bars: song.measureStarts.length, parts: song.parts.length })}`
              : ''}
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <InputSourcePicker
              value={input.source}
              midiCount={input.midiDevices.length}
              onChange={input.choose}
            />
          </Box>
        </Stack>
        {songState.error && !pickerOpen && (
          <Alert severity="error" onClose={songState.clearError}>
            {k('action_error', { error: songState.error })}
          </Alert>
        )}
        <StageToolbar
          engine={engine}
          display={display}
          onDisplay={setDisplay}
          onTogglePause={togglePause}
          onFullscreen={() => void fullscreen.enter()}
        />
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
                  bottom: 64,
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
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'background.paper',
                  borderRadius: 2,
                  p: 0.5,
                  opacity: 0.6,
                  '&:hover': { opacity: 1 },
                }}
              >
                <Button size="small" onClick={togglePause}>
                  {engine.state === 'playing' ? k('pause') : k('resume')}
                </Button>
                <Button
                  size="small"
                  onClick={() => setDisplay(display === 'notation' ? 'instrument' : 'notation')}
                >
                  {display === 'notation' ? k('view_instrument') : k('view_notation')}
                </Button>
                <Button size="small" onClick={fullscreen.exit}>
                  {k('exit_fullscreen')}
                </Button>
              </Stack>
            )}
          </StageCanvas>
        </Paper>
        <SeekBar engine={engine} />
        <SectionStrip engine={engine} />
        <RecordingBar state={songState} />
        <PlayerList engine={engine} onInvite={openInvite} onRemoveRemote={removeRemote} />
      </Stack>
      <SongPicker open={pickerOpen} onClose={() => setPickerOpen(false)} state={songState} />
      <SoundSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
