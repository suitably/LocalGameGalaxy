import React, { useCallback, useRef, useState } from 'react';
import { Paper, Box } from '@mui/material';
import { GameLayout } from '../../components/Layout/GameLayout';
import { useMelodiqNotesState } from './hooks/useMelodiqNotesState';
import { useStemAudioPlayer } from './hooks/useStemAudioPlayer';
import { InstrumentSelectorBar } from './components/InstrumentSelectorBar';
import { SheetMusicViewer, type SheetMusicViewerRef } from './SheetMusicViewer';
import { ModernNoteHighway } from './components/ModernNoteHighway';
import { NoteStatusBar } from './components/NoteStatusBar';
import { PlaybackControlsBar } from './components/PlaybackControlsBar';
import { EnsembleMixerDialog } from './components/EnsembleMixerDialog';
import { MelodiqNotesSettingsDialog } from './components/MelodiqNotesSettingsDialog';
import { SongSelectDialog } from './components/SongSelectDialog';

import { useMelodiqNotesHeader } from './hooks/useMelodiqNotesHeader';

/** Keeps OSMD mounted (it owns the cursor) without showing it. */
const OFFSCREEN_SX = {
  position: 'fixed',
  top: -99999,
  left: -99999,
  width: 1000,
  height: 600,
  overflow: 'hidden',
  visibility: 'hidden',
  pointerEvents: 'none',
} as const;

export const MelodiqNotesGame: React.FC = () => {
  const viewerRef = useRef<SheetMusicViewerRef>(null);
  const { song, library, mixer, view, input, playback, stats, dialogs, reloadSoundConfig } =
    useMelodiqNotesState({ viewerRef });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { setIsMixerOpen, setIsSongSelectOpen } = dialogs;

  // Stable callbacks: the header hook pushes them into context from an effect,
  // so a new identity per render would loop forever.
  const openMixer = useCallback(() => setIsMixerOpen(true), [setIsMixerOpen]);
  const openSongSelect = useCallback(() => setIsSongSelectOpen(true), [setIsSongSelectOpen]);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);

  useMelodiqNotesHeader({
    currentTitle: song.title,
    currentArtist: song.artist,
    effectiveBpm: song.effectiveBpm,
    partsCount: song.parts.length,
    onOpenSongSelect: openSongSelect,
    onOpenMixer: openMixer,
    onOpenSettings: openSettings,
  });

  useStemAudioPlayer({
    stems: song.stems,
    speedPercent: playback.speedPercent,
    syncOffsetMs: song.syncOffsetMs,
    isPlaying: playback.isPlaying,
  });

  return (
    <GameLayout maxWidth="lg" disablePadding>
      <Paper
        elevation={3}
        sx={{
          p: { xs: 1.5, sm: 3 },
          borderRadius: 3.5,
          background:
            'linear-gradient(135deg, rgba(26, 26, 42, 0.95) 0%, rgba(15, 15, 26, 0.95) 100%)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* 1. Note Accuracy & Score HUD Bar */}
        <NoteStatusBar
          targetNotes={playback.targetNotes}
          playedPitches={input.playedPitches}
          isCurrentNoteHit={stats.isCurrentNoteHit}
          score={stats.score}
          hitCount={stats.hitCount}
        />

        {/* 2. Track Selector Bar (only shown if multi-track) */}
        {song.parts.length > 1 && (
          <InstrumentSelectorBar
            parts={song.parts}
            selectedPartId={mixer.selectedPartId}
            mixerChannels={mixer.mixerChannels}
            soloInstrumentInSheet={mixer.soloInstrumentInSheet}
            onSelectPart={mixer.setSelectedPartId}
            onToggleSoloSheet={mixer.setSoloInstrumentInSheet}
            onOpenMixer={openMixer}
          />
        )}

        {/* 3. Main Stage: the sheet viewer always drives the cursor; in modern mode it is rendered off-screen */}
        <Box sx={view.viewMode === 'classic' ? { display: 'block' } : OFFSCREEN_SX}>
          <SheetMusicViewer
            ref={viewerRef}
            xmlContent={song.xmlContent}
            selectedPartId={mixer.selectedPartId}
            soloInstrumentInSheet={mixer.soloInstrumentInSheet}
            renderMode={view.sheetRenderMode}
            onRenderModeChange={view.setSheetRenderMode}
            isCurrentNoteHit={stats.isCurrentNoteHit}
            onNotesChanged={playback.handleNotesChanged}
            onSongEnd={playback.handleSongEnd}
            onBpmDetected={song.handleBpmDetected}
          />
        </Box>

        {view.viewMode === 'modern' && (
          <ModernNoteHighway
            tracks={song.timelineTracks}
            selectedPartId={mixer.selectedPartId}
            subMode={view.modernSubMode}
            currentBeats={playback.currentBeats}
            targetNotes={playback.targetNotes}
            playedPitches={input.playedPitches}
            isCurrentNoteHit={stats.isCurrentNoteHit}
            isPlaying={playback.isPlaying}
            effectiveBpm={song.effectiveBpm}
            onSubModeChange={view.setModernSubMode}
          />
        )}

        {/* 4. Docked Playback Controls Bar (Play, Reset, Speed Popover & Settings) */}
        <PlaybackControlsBar
          isPlaying={playback.isPlaying}
          speedPercent={playback.speedPercent}
          effectiveBpm={song.effectiveBpm}
          onTogglePlay={() => playback.setIsPlaying(!playback.isPlaying)}
          onReset={playback.handleReset}
          onSpeedPercentChange={playback.setSpeedPercent}
        />
      </Paper>

      {/* Modal Dialogs */}
      <SongSelectDialog
        open={dialogs.isSongSelectOpen}
        onClose={() => dialogs.setIsSongSelectOpen(false)}
        selectedSong={song.source.kind === 'demo' ? song.source.song : null}
        selectedLocalSong={song.source.kind === 'library' ? song.source.song : null}
        librarySongs={library.librarySongs}
        storedFolders={library.storedFolders}
        isSyncing={library.isSyncing}
        supportsDirectoryPicker={library.supportsDirectoryPicker}
        onSongChange={song.handleSongChange}
        onLocalSongSelect={song.handleLocalSongSelect}
        onFileUpload={song.handleFileUpload}
        onSyncFolder={library.handleSyncFolder}
        onResyncFolders={library.handleResyncFolders}
        onFolderFileInput={library.handleFolderFileInput}
        onRemoveFolder={library.handleRemoveFolder}
      />

      <EnsembleMixerDialog
        open={dialogs.isMixerOpen}
        onClose={() => dialogs.setIsMixerOpen(false)}
        parts={song.parts}
        channels={mixer.mixerChannels}
        selectedPartId={mixer.selectedPartId}
        mutePlayerPart={mixer.mutePlayerPart}
        masterVolume={mixer.masterVolume}
        onChannelChange={mixer.handleChannelChange}
        onMasterVolumeChange={mixer.setMasterVolume}
        onToggleMutePlayerPart={mixer.setMutePlayerPart}
      />

      <MelodiqNotesSettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        viewMode={view.viewMode}
        onViewModeChange={view.handleViewModeChange}
        sheetRenderMode={view.sheetRenderMode}
        onSheetRenderModeChange={view.setSheetRenderMode}
        playMode={playback.playMode}
        onPlayModeChange={playback.setPlayMode}
        inputSource={input.inputSource}
        onInputSourceChange={input.setInputSource}
        midiDevices={input.midiDevices}
        selectedDeviceId={input.selectedDeviceId}
        onSelectDeviceId={input.setSelectedDeviceId}
        isMicActive={input.isMicActive}
        micPitch={input.micPitch}
        onToggleMicrophone={input.toggleMicrophone}
        partsCount={song.parts.length}
        onOpenMixer={openMixer}
        onSoundConfigChanged={reloadSoundConfig}
      />
    </GameLayout>
  );
};
