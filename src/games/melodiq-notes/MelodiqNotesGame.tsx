import React from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Stack,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTranslation } from 'react-i18next';

import { usePageTitle } from '../../context/TitleContext';
import { SheetMusicViewer } from './SheetMusicViewer';
import { ControlPanel } from './components/ControlPanel';
import { BottomActionBar } from './components/BottomActionBar';
import { useStemAudioPlayer } from './hooks/useStemAudioPlayer';
import { useMobileMediaQuery } from './hooks/useMobileMediaQuery';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import { HardwareStatus } from './components/HardwareStatus';
import { NoteStatusBar } from './components/NoteStatusBar';
import { useMelodiqNotesState } from './hooks/useMelodiqNotesState';

export const MelodiqNotesGame: React.FC = () => {
    const { t } = useTranslation();
    usePageTitle(t('games.melodiq_notes.title'));

    const isMobile = useMobileMediaQuery();

    const {
        selectedSong,
        customXmlContent,
        playMode,
        setPlayMode,
        inputSource,
        setInputSource,
        isPlaying,
        setIsPlaying,
        speedPercent,
        setSpeedPercent,
        effectiveBpm,
        targetNotes,
        playedPitches,
        score,
        hitCount,
        isCurrentNoteHit,
        midiDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        micPitch,
        isMicActive,
        viewerRef,
        currentXmlContent,
        librarySongs,
        storedFolders,
        selectedLocalSong,
        isSyncing,
        supportsDirectoryPicker,
        toggleMicrophone,
        handleFileUpload,
        handleSongChange,
        handleLocalSongSelect,
        handleSyncFolder,
        handleResyncFolders,
        handleFolderFileInput,
        handleRemoveFolder,
        handleBpmDetected,
        handleReset,
        handleSongEnd,
        handleNotesChanged
    } = useMelodiqNotesState();

    const { mutedStems, toggleMute } = useStemAudioPlayer({
        stems: selectedLocalSong?.stems || selectedSong.stems,
        speedPercent,
        syncOffsetMs: selectedLocalSong?.sync_offset_ms || selectedSong.sync_offset_ms || 0,
        isPlaying
    });

    const stemsAvailable = !!(selectedLocalSong?.stems || selectedSong.stems);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 2, sm: 4 },
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(30, 30, 45, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <MusicNoteIcon sx={{ fontSize: 36, color: 'primary.main' }} />
                        <Typography variant="h4" fontWeight="bold" sx={{ color: 'white' }}>
                            {t('games.melodiq_notes.title')}
                        </Typography>
                        <Chip label={t('games.melodiq_notes.beta')} color="secondary" size="small" />
                    </Stack>

                    {/* Stats */}
                    <Stack direction="row" spacing={3} alignItems="center">
                        <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">{t('games.melodiq_notes.score')}</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary.main">{score}</Typography>
                        </Box>
                        <Box textAlign="center">
                            <Typography variant="caption" color="text.secondary">{t('games.melodiq_notes.hits')}</Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">{hitCount}</Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Settings Accordion */}
                <Accordion
                    defaultExpanded={!isMobile}
                    sx={{
                        mb: 3,
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        '&:before': { display: 'none' }
                    }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <SettingsIcon fontSize="small" />
                            <Typography>{t('games.melodiq_notes.settings', 'Settings & Setup')}</Typography>
                        </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                        {/* Control Panel */}
                        <ControlPanel
                            selectedSong={selectedSong}
                            customXmlContent={customXmlContent}
                            playMode={playMode}
                            inputSource={inputSource}
                            librarySongs={librarySongs}
                            storedFolders={storedFolders}
                            selectedLocalSong={selectedLocalSong}
                            isSyncing={isSyncing}
                            supportsDirectoryPicker={supportsDirectoryPicker}
                            onSongChange={handleSongChange}
                            onFileUpload={handleFileUpload}
                            onPlayModeChange={setPlayMode}
                            onInputSourceChange={setInputSource}
                            onLocalSongSelect={handleLocalSongSelect}
                            onSyncFolder={handleSyncFolder}
                            onResyncFolders={handleResyncFolders}
                            onFolderFileInput={handleFolderFileInput}
                            onRemoveFolder={handleRemoveFolder}
                        />

                        {/* Hardware Connection Status */}
                        <HardwareStatus
                            inputSource={inputSource}
                            midiDevices={midiDevices}
                            selectedDeviceId={selectedDeviceId}
                            onSelectDeviceId={setSelectedDeviceId}
                            isMicActive={isMicActive}
                            micPitch={micPitch}
                            onToggleMicrophone={toggleMicrophone}
                        />
                    </AccordionDetails>
                </Accordion>

                {/* Target & Played Notes Display */}
                <NoteStatusBar
                    targetNotes={targetNotes}
                    playedPitches={playedPitches}
                    isCurrentNoteHit={isCurrentNoteHit}
                />

                {/* Sheet Music Viewer Container */}
                <SheetMusicViewer
                    ref={viewerRef}
                    xmlContent={currentXmlContent}
                    isCurrentNoteHit={isCurrentNoteHit}
                    onNotesChanged={handleNotesChanged}
                    onSongEnd={handleSongEnd}
                    onBpmDetected={handleBpmDetected}
                />

                <Box sx={{ pb: { xs: 12, sm: 10 } }} /> {/* Spacer for BottomActionBar */}
                <BottomActionBar
                    isPlaying={isPlaying}
                    playMode={playMode}
                    speedPercent={speedPercent}
                    effectiveBpm={effectiveBpm}
                    mutedStems={mutedStems}
                    stemsAvailable={stemsAvailable}
                    onTogglePlay={() => setIsPlaying(!isPlaying)}
                    onReset={handleReset}
                    onSpeedPercentChange={setSpeedPercent}
                    onToggleMute={toggleMute}
                />
            </Paper>
        </Container>
    );
};
