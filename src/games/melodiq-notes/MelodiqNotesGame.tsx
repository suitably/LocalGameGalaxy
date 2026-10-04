import React, { useRef, useState } from 'react';
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

export const MelodiqNotesGame: React.FC = () => {
    const viewerRef = useRef<SheetMusicViewerRef>(null);
    const state = useMelodiqNotesState({ viewerRef });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useMelodiqNotesHeader({
        currentTitle: state.currentTitle,
        currentArtist: state.currentArtist,
        effectiveBpm: state.effectiveBpm,
        partsCount: state.parts.length,
        onOpenSongSelect: () => state.setIsSongSelectOpen(true),
        onOpenMixer: () => state.setIsMixerOpen(true),
        onOpenSettings: () => setIsSettingsOpen(true),
    });

    useStemAudioPlayer({
        stems: state.selectedLocalSong?.stems || state.selectedSong?.stems,
        speedPercent: state.speedPercent,
        syncOffsetMs: state.selectedLocalSong?.sync_offset_ms || state.selectedSong?.sync_offset_ms || 0,
        isPlaying: state.isPlaying,
    });

    return (
        <GameLayout maxWidth="lg" disablePadding>
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 1.5, sm: 3 },
                    borderRadius: 3.5,
                    background: 'linear-gradient(135deg, rgba(26, 26, 42, 0.95) 0%, rgba(15, 15, 26, 0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                }}
            >
                {/* 1. Note Accuracy & Score HUD Bar */}
                <NoteStatusBar
                    targetNotes={state.targetNotes}
                    playedPitches={state.playedPitches}
                    isCurrentNoteHit={state.isCurrentNoteHit}
                    score={state.score}
                    hitCount={state.hitCount}
                />

                {/* 2. Track Selector Bar (only shown if multi-track) */}
                {state.parts.length > 1 && (
                    <InstrumentSelectorBar
                        parts={state.parts}
                        selectedPartId={state.selectedPartId}
                        mixerChannels={state.mixerChannels}
                        soloInstrumentInSheet={state.soloInstrumentInSheet}
                        onSelectPart={state.setSelectedPartId}
                        onToggleSoloSheet={state.setSoloInstrumentInSheet}
                        onOpenMixer={() => state.setIsMixerOpen(true)}
                    />
                )}


                {/* 4. Main Stage: Classic Sheet Music & Modern Note Highway */}
                <Box
                    sx={
                        state.viewMode === 'classic'
                            ? { display: 'block' }
                            : {
                                position: 'fixed',
                                top: -99999,
                                left: -99999,
                                width: 1000,
                                height: 600,
                                overflow: 'hidden',
                                visibility: 'hidden',
                                pointerEvents: 'none',
                            }
                    }
                >
                    <SheetMusicViewer
                        ref={viewerRef}
                        xmlContent={state.currentXmlContent}
                        selectedPartId={state.selectedPartId}
                        soloInstrumentInSheet={state.soloInstrumentInSheet}
                        renderMode={state.sheetRenderMode}
                        onRenderModeChange={state.setSheetRenderMode}
                        isCurrentNoteHit={state.isCurrentNoteHit}
                        onNotesChanged={state.handleNotesChanged}
                        onSongEnd={state.handleSongEnd}
                        onBpmDetected={state.handleBpmDetected}
                    />
                </Box>

                {state.viewMode === 'modern' && (
                    <ModernNoteHighway
                        tracks={state.timelineTracks}
                        selectedPartId={state.selectedPartId}
                        subMode={state.modernSubMode}
                        currentBeats={state.currentBeats}
                        targetNotes={state.targetNotes}
                        playedPitches={state.playedPitches}
                        isCurrentNoteHit={state.isCurrentNoteHit}
                        isPlaying={state.isPlaying}
                        effectiveBpm={state.effectiveBpm}
                        onSubModeChange={state.setModernSubMode}
                    />
                )}

                {/* 5. Docked Playback Controls Bar (Play, Reset, Speed Popover & Settings) */}
                <PlaybackControlsBar
                    isPlaying={state.isPlaying}
                    speedPercent={state.speedPercent}
                    effectiveBpm={state.effectiveBpm}
                    onTogglePlay={() => state.setIsPlaying(!state.isPlaying)}
                    onReset={state.handleReset}
                    onSpeedPercentChange={state.setSpeedPercent}
                />
            </Paper>

            {/* Modal Dialogs */}
            <SongSelectDialog
                open={state.isSongSelectOpen}
                onClose={() => state.setIsSongSelectOpen(false)}
                selectedSong={state.selectedSong}
                selectedLocalSong={state.selectedLocalSong}
                librarySongs={state.librarySongs}
                storedFolders={state.storedFolders}
                isSyncing={state.isSyncing}
                supportsDirectoryPicker={state.supportsDirectoryPicker}
                onSongChange={state.handleSongChange}
                onLocalSongSelect={state.handleLocalSongSelect}
                onFileUpload={state.handleFileUpload}
                onSyncFolder={state.handleSyncFolder}
                onResyncFolders={state.handleResyncFolders}
                onFolderFileInput={state.handleFolderFileInput}
                onRemoveFolder={state.handleRemoveFolder}
            />

            <EnsembleMixerDialog
                open={state.isMixerOpen}
                onClose={() => state.setIsMixerOpen(false)}
                parts={state.parts}
                channels={state.mixerChannels}
                selectedPartId={state.selectedPartId}
                mutePlayerPart={state.mutePlayerPart}
                masterVolume={state.masterVolume}
                onChannelChange={state.handleChannelChange}
                onMasterVolumeChange={state.setMasterVolume}
                onToggleMutePlayerPart={state.setMutePlayerPart}
            />

            <MelodiqNotesSettingsDialog
                open={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                viewMode={state.viewMode}
                onViewModeChange={state.handleViewModeChange}
                sheetRenderMode={state.sheetRenderMode}
                onSheetRenderModeChange={state.setSheetRenderMode}
                playMode={state.playMode}
                onPlayModeChange={state.setPlayMode}
                inputSource={state.inputSource}
                onInputSourceChange={state.setInputSource}
                midiDevices={state.midiDevices}
                selectedDeviceId={state.selectedDeviceId}
                onSelectDeviceId={state.setSelectedDeviceId}
                isMicActive={state.isMicActive}
                micPitch={state.micPitch}
                onToggleMicrophone={state.toggleMicrophone}
                partsCount={state.parts.length}
                onOpenMixer={() => state.setIsMixerOpen(true)}
                onSoundConfigChanged={state.reloadSoundConfig}
            />
        </GameLayout>
    );
};
