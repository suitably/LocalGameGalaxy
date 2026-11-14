import React from 'react';
import { Box, Typography } from '@mui/material';
import { useStageChrome } from '../hooks/useStageChrome';
import { STAGE_CHROME_HIDE_MS, TV_STAGE_CHROME_HIDE_MS } from '../logic/stageChrome';
import type { MelodiqSessionCore } from '../hooks/useMelodiqSessionCore';
import { SessionTopControls } from './SessionTopControls';
import { SessionTransportControls } from './SessionTransportControls';
import { SessionScoreOverlay } from './SessionScoreOverlay';
import { SessionPauseOverlay } from './SessionPauseOverlay';
import { SessionBackgroundMedia } from './SessionBackgroundMedia';
import { SessionLyricsVisualizer } from './SessionLyricsVisualizer';
import type { MelodiqSessionProps } from '../types';

export interface SessionStageProps {
  session: MelodiqSessionProps;
  core: MelodiqSessionCore;
}

/** The playing stage: background media, header, transport, pitch lanes and lyrics. */
export const SessionStage: React.FC<SessionStageProps> = ({ session, core }) => {
  const {
    song,
    initialTime,
    onExit,
    onMinimize,
    isTVMode = false,
    muteAudio = false,
    isPassive = false,
    passiveState,
    suppressResults = false,
    uiScale = 1.0,
    isClient = false,
    onRequestTogglePlay,
    onRequestNext,
  } = session;
  const { settings, parsedSong, audioSrc, videoSrc, vocalsSrc, videoError, setVideoError } = core;
  const { switchTrack, audioCtrl, players, scoringCtrl, handleSongEndBound } = core;
  const { audioRef, vocalsRef } = audioCtrl;
  // Phone, host and TV alike: the header is a title card at song start and while paused.
  const chrome = useStageChrome(
    audioCtrl.isPlaying,
    isTVMode ? TV_STAGE_CHROME_HIDE_MS : STAGE_CHROME_HIDE_MS,
  );

  const activeLyricsScale =
    isPassive && passiveState?.lyricsScale !== undefined
      ? passiveState.lyricsScale
      : (settings.lyricsScale ?? 1.0);
  const activeLyricsZoom =
    isPassive && passiveState?.enableLyricsZoom !== undefined
      ? passiveState.enableLyricsZoom
      : (settings.enableLyricsZoom ?? false);
  const activeLyricsLines =
    isPassive && passiveState?.lyricsLines !== undefined
      ? passiveState.lyricsLines
      : (settings.lyricsLines ?? 2);
  const activeLyricsPosition =
    isPassive && passiveState?.lyricsPosition !== undefined
      ? passiveState.lyricsPosition
      : (settings.lyricsPosition ?? 'bottom');

  return (
    <Box
      {...chrome.stageHandlers}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'black',
        color: 'white',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <SessionBackgroundMedia
        videoSrc={videoSrc}
        hideBackgroundVideo={settings.hideBackgroundVideo}
        fallbackBackgroundUrl={settings.fallbackBackgroundUrl}
        videoRef={audioCtrl.videoRef}
        initialTime={initialTime}
        videoError={videoError}
        showVideoErrors={settings.showVideoErrors}
        setVideoError={setVideoError}
        passivePlayBlocked={audioCtrl.passivePlayBlocked}
        isPassive={isPassive}
        onPassiveUnblock={audioCtrl.handlePassiveUnblock}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          pointerEvents: 'none',
        }}
      >
        <SessionTopControls
          artist={song.artist}
          title={song.title}
          uiScale={uiScale}
          isTVMode={isTVMode}
          onMinimize={onMinimize}
          scoreDisplayRef={scoringCtrl.scoreDisplayRef}
          visiblePlayers={scoringCtrl.visiblePlayers}
          progressLineRef={scoringCtrl.progressLineRef}
          isUIVisible={chrome.visible}
        />
        {/* The TV mirrors the host and has no pointer: no buttons there */}
        {!isTVMode && (
          <SessionTransportControls
            visible={chrome.visible}
            isPlaying={audioCtrl.isPlaying}
            onTogglePlay={onRequestTogglePlay ?? audioCtrl.togglePlay}
            onNext={onRequestNext}
          />
        )}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: 0,
            pt: scoringCtrl.visiblePlayers.length === 0 ? 0 : isTVMode ? 12 : 10,
          }}
        >
          <SessionLyricsVisualizer
            visiblePlayers={scoringCtrl.visiblePlayers}
            allPlayers={players}
            parsedSong={parsedSong!}
            timeProxyRef={audioCtrl.timeProxyRef}
            lyricsUiScale={uiScale * activeLyricsScale}
            activeLyricsZoom={activeLyricsZoom}
            activeLyricsLines={activeLyricsLines}
            activeLyricsPosition={activeLyricsPosition}
            gridLayout={scoringCtrl.gridLayout}
            showDebugOverlay={settings.showDebugOverlay}
            showNoteLabels={settings.showNoteLabels}
            uiScale={uiScale}
            onSwitchTrack={switchTrack}
          />
        </Box>

        <SessionScoreOverlay
          showDevSlider={settings.showDevSlider}
          devPitchOverride={scoringCtrl.devPitchOverride}
          onDevPitchChange={scoringCtrl.setDevPitchOverride}
        />
      </Box>

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onEnded={handleSongEndBound}
          muted={muteAudio}
          onError={(e) => console.warn('[Session] Audio element load error:', e)}
          style={{ display: 'none' }}
        />
      )}
      {vocalsSrc && (
        <audio
          ref={vocalsRef}
          src={vocalsSrc}
          preload="auto"
          muted={muteAudio}
          onError={(e) => console.warn('[Session] Vocals element load error:', e)}
          style={{ display: 'none' }}
        />
      )}
      {!audioSrc && !isClient && (
        <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>
          No Audio Source Found
        </Typography>
      )}

      <SessionPauseOverlay
        isPausedForScore={audioCtrl.isPausedForScore}
        suppressResults={suppressResults}
        players={players}
        onExit={onExit}
        onResume={audioCtrl.resumeFromScore}
        setIsPausedForScore={audioCtrl.setIsPausedForScore}
      />
    </Box>
  );
};
