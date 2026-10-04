import React, { useRef } from 'react';
import { Paper, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { GameLayout } from '../../components/Layout/GameLayout';
import { useMelodiqNotesState } from './hooks/useMelodiqNotesState';
import { useStemAudioPlayer } from './hooks/useStemAudioPlayer';
import { MelodiqNotesHeader } from './components/MelodiqNotesHeader';
import { InstrumentSelectorBar } from './components/InstrumentSelectorBar';
import { SheetMusicViewer, type SheetMusicViewerRef } from './SheetMusicViewer';
import { ModernNoteHighway } from './components/ModernNoteHighway';
import { NoteStatusBar } from './components/NoteStatusBar';
import { PlaybackControlsBar } from './components/PlaybackControlsBar';
import { HardwareStatus } from './components/HardwareStatus';
import { EnsembleMixerDialog } from './components/EnsembleMixerDialog';
import { SoundSettingsDialog } from './components/SoundSettingsDialog';
import { SongSelectDialog } from './components/SongSelectDialog';

export const MelodiqNotesGame: React.FC = () => {
    const { t } = useTranslation();
    usePageTitle(t('games.melodiq_notes.title'));

    const viewerRef = useRef<SheetMusicViewerRef>(null);
    const state = useMelodiqNotesState({ viewerRef });

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
                    p: { xs: 2, sm: 3.5 },
                    borderRadius: 3.5,
                    background: 'linear-gradient(135deg, rgba(26, 26, 42, 0.95) 0%, rgba(15, 15, 26, 0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
                }}
            >
                {/* 1. Header with Song Title, Score & View Mode Toggle */}
                <MelodiqNotesHeader
                    currentTitle={state.currentTitle}
                    currentArtist={state.currentArtist}
                    effectiveBpm={state.effectiveBpm}
                    score={state.score}
                    hitCount={state.hitCount}
                    viewMode={state.viewMode}
                    partsCount={state.parts.length}
                    onViewModeChange={state.handleViewModeChange}
                    onOpenMixer={() => state.setIsMixerOpen(true)}
                    onOpenSoundSettings={() => state.setIsSoundSettingsOpen(true)}
                    onOpenSongSelect={() => state.setIsSongSelectOpen(true)}
                />

                {/* 2. Multi-Instrument Track Selector Bar */}
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

                {/* 3. Note Accuracy & Pitch Status Bar */}
                <NoteStatusBar
                    targetNotes={state.targetNotes}
                    playedPitches={state.playedPitches}
                    isCurrentNoteHit={state.isCurrentNoteHit}
                />

                {/* 4. Main Stage: Classic Sheet Music & Modern Note Highway (kept mounted for 0ms toggle) */}
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

                {/* 5. Hardware Device Status */}
                <HardwareStatus
                    inputSource={state.inputSource}
                    midiDevices={state.midiDevices}
                    selectedDeviceId={state.selectedDeviceId}
                    onSelectDeviceId={state.setSelectedDeviceId}
                    isMicActive={state.isMicActive}
                    micPitch={state.micPitch}
                    onToggleMicrophone={state.toggleMicrophone}
                />

                {/* 6. Docked Playback Controls Bar */}
                <PlaybackControlsBar
                    isPlaying={state.isPlaying}
                    playMode={state.playMode}
                    inputSource={state.inputSource}
                    speedPercent={state.speedPercent}
                    effectiveBpm={state.effectiveBpm}
                    onTogglePlay={() => state.setIsPlaying(!state.isPlaying)}
                    onReset={state.handleReset}
                    onPlayModeChange={state.setPlayMode}
                    onInputSourceChange={state.setInputSource}
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

            <SoundSettingsDialog
                open={state.isSoundSettingsOpen}
                onClose={() => state.setIsSoundSettingsOpen(false)}
                onConfigChanged={state.reloadSoundConfig}
            />
        </GameLayout>
    );
};
