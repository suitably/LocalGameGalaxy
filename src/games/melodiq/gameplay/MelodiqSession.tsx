import React, { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ScoreBoard } from './ScoreBoard';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import { useWebRTC } from '../audio/WebRTCContext';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useMediaLoaders } from './hooks/useMediaLoaders';
import { useSessionPlayers } from './hooks/useSessionPlayers';
import { useSessionEnd } from './hooks/useSessionEnd';
import { usePassiveSync } from './hooks/usePassiveSync';
import { useScreenOrientation } from '../../../hooks/useScreenOrientation';
import { useSessionAudioController } from './hooks/useSessionAudioController';
import { useSessionScoringController } from './hooks/useSessionScoringController';
import { useParsedSong } from './hooks/useParsedSong';
import { SessionTopControls } from './components/SessionTopControls';
import { SessionScoreOverlay } from './components/SessionScoreOverlay';
import { SessionPauseOverlay } from './components/SessionPauseOverlay';
import { SessionBackgroundMedia } from './components/SessionBackgroundMedia';
import { SessionLyricsVisualizer } from './components/SessionLyricsVisualizer';
import { SessionFolderPrompt } from './components/SessionFolderPrompt';
import type { MelodiqSessionHandle, MelodiqSessionProps } from './types';

export type { MelodiqSessionHandle, MelodiqSessionProps } from './types';

const MelodiqSessionContent = forwardRef(({
    song, initialTime, onExit, onMinimize, onPlaybackUpdate, isTVMode = false,
    muteAudio = false, isPassive = false, passiveState, activeSessionOverride = null,
    suppressResults = false, uiScale = 1.0, isClient = false, clientDeviceId
}: MelodiqSessionProps, ref: React.ForwardedRef<MelodiqSessionHandle>): React.ReactNode => {
    const { settings } = useMelodiqSettings();
    const { manager, activePeers } = useWebRTC();
    useScreenOrientation('landscape');

    const [results, setResults] = useState<any[]>([]);
    const { parsedSong, contentLoading, loadError } = useParsedSong(song);

    const {
        audioSrc, videoSrc, vocalsSrc, needsFolderAccess, videoError,
        setVideoError, folderInputRef, handleFolderInputChange
    } = useMediaLoaders(song, parsedSong, isClient, settings.audioPlaybackMode ?? 'separated');

    const switchTrack = useCallback((playerIndex: number, trackIndex: number) => {
        setPlayers(prev => {
            const newPlayers = [...prev];
            const p = newPlayers[playerIndex];
            if (p) {
                p.trackIndex = (parsedSong?.tracks && trackIndex < parsedSong.tracks.length) ? trackIndex : 0;
                p.activeSegments = {};
            }
            return newPlayers;
        });
    }, [parsedSong]);

    const audioCtrl = useSessionAudioController({
        songId: song.id, audioSrc, vocalsSrc, videoSrc, initialTime, muteAudio,
        songVolume: settings.songVolume, masterVolume: settings.masterVolume,
        vocalsVolume: settings.vocalsVolume ?? 1.0, audioPlaybackMode: settings.audioPlaybackMode,
        isPassive, passiveState, isClient, ready: !contentLoading && !!parsedSong,
        contentLoading, parsedSong, onExit, onPlaybackUpdate
    });

    const { players, setPlayers, playersRef, ready } = useSessionPlayers({
        manager, activePeers, parsedSong, song, switchTrack, setResults, onExit,
        audioRef: audioCtrl.audioRef, vocalsRef: audioCtrl.vocalsRef, videoRef: audioCtrl.videoRef,
        activeSessionOverride, isPassive
    });

    const { handleSongEnd: handleSongEndBound } = useSessionEnd({
        playersRef, song, setResults, setIsFinished: audioCtrl.setIsFinished,
        setIsPlaying: audioCtrl.setIsPlaying, videoRef: audioCtrl.videoRef, isTVMode
    });

    const scoringCtrl = useSessionScoringController({
        players, ready, audioRef: audioCtrl.audioRef, vocalsRef: audioCtrl.vocalsRef,
        videoRef: audioCtrl.videoRef, virtualTimeRef: audioCtrl.virtualTimeRef,
        isPlayingRef: audioCtrl.isPlayingRef, parsedSong,
        goldenNoteMultiplier: settings.goldenNoteMultiplier,
        isPassive, passiveState, isClient, duration: audioCtrl.duration,
        micLatency: settings.micLatency || 0, onPlaybackUpdate, activeSessionOverride,
        clientDeviceId, customLayouts: settings.customLayouts
    });

    usePassiveSync({
        isPassive, passiveState: passiveState || null, isClient, isTVMode, players, setPlayers, playersRef,
        scoreDisplayRef: scoringCtrl.scoreDisplayRef, audioRef: audioCtrl.audioRef, vocalsRef: audioCtrl.vocalsRef,
        videoRef: audioCtrl.videoRef, isPlayingRef: audioCtrl.isPlayingRef, setIsPlaying: audioCtrl.setIsPlaying,
        setIsFinished: audioCtrl.setIsFinished, setIsPausedForScore: audioCtrl.setIsPausedForScore,
        setPassivePlayBlocked: audioCtrl.setPassivePlayBlocked, virtualTimeRef: audioCtrl.virtualTimeRef
    });

    useImperativeHandle(ref, () => ({
        togglePlay: audioCtrl.togglePlay,
        isPlaying: audioCtrl.isPlaying,
        getDuration: () => audioCtrl.audioRef.current?.duration || 0,
        getCurrentTime: () => audioCtrl.audioRef.current?.currentTime || 0,
        finishSong: handleSongEndBound,
        isFinished: audioCtrl.isFinished,
        pauseForScore: audioCtrl.pauseForScore,
        resumeFromScore: audioCtrl.resumeFromScore,
        isPausedForScore: audioCtrl.isPausedForScore,
        handleNext: audioCtrl.handleNext,
        getGameState: () => ({
            isPlaying: audioCtrl.isPlaying,
            isFinished: audioCtrl.isFinished,
            isPausedForScore: audioCtrl.isPausedForScore,
            lyricsScale: settings.lyricsScale ?? 1.0,
            enableLyricsZoom: settings.enableLyricsZoom ?? false,
            lyricsPosition: settings.lyricsPosition ?? 'bottom',
            players: playersRef.current.map(p => ({
                config: p.config, id: p.config.id, name: p.config.name, hue: p.config.hue,
                score: p.score, trackScores: p.trackScores, currentPitch: p.pitchRef.current,
                activeSegments: p.activeSegments, sungSegments: p.segmentsRef.current,
                combo: p.combo, lastHit: p.lastHit
            })),
            currentTime: audioCtrl.audioRef.current?.currentTime || 0
        })
    }), [audioCtrl, handleSongEndBound, playersRef, settings.lyricsScale, settings.enableLyricsZoom, settings.lyricsPosition]);

    if (loadError) {
        return (
            <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
                <Typography variant="h6" color="error" align="center">{loadError}</Typography>
                <Button variant="contained" onClick={() => onExit(true)}>Go Back</Button>
            </Box>
        );
    }

    if (!audioCtrl.isPausedForScore && (!ready || contentLoading || !parsedSong)) {
        return <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Loading...</Typography></Box>;
    }

    if (needsFolderAccess) {
        return <SessionFolderPrompt artist={song.artist} title={song.title} folderInputRef={folderInputRef} onFolderInputChange={handleFolderInputChange} onExit={onExit} />;
    }

    if (audioCtrl.isFinished && !suppressResults) {
        return <ScoreBoard players={results.length > 0 ? results : players.map(p => ({ config: p.config, score: p.score, history: [], isNewRecord: false }))} onExit={onExit} isPassive={isPassive} onMinimize={onMinimize} />;
    }

    const activeLyricsScale = (isPassive && passiveState?.lyricsScale !== undefined) ? passiveState.lyricsScale : (settings.lyricsScale ?? 1.0);
    const activeLyricsZoom = (isPassive && passiveState?.enableLyricsZoom !== undefined) ? passiveState.enableLyricsZoom : (settings.enableLyricsZoom ?? false);
    const activeLyricsLines = (isPassive && passiveState?.lyricsLines !== undefined) ? passiveState.lyricsLines : (settings.lyricsLines ?? 2);
    const activeLyricsPosition = (isPassive && passiveState?.lyricsPosition !== undefined) ? passiveState.lyricsPosition : (settings.lyricsPosition ?? 'bottom');

    return (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'black', color: 'white', zIndex: 1300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SessionBackgroundMedia
                videoSrc={videoSrc} hideBackgroundVideo={settings.hideBackgroundVideo}
                fallbackBackgroundUrl={settings.fallbackBackgroundUrl} videoRef={audioCtrl.videoRef}
                initialTime={initialTime} videoError={videoError} showVideoErrors={settings.showVideoErrors}
                setVideoError={setVideoError} passivePlayBlocked={audioCtrl.passivePlayBlocked}
                isPassive={isPassive} onPassiveUnblock={audioCtrl.handlePassiveUnblock}
            />

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <SessionTopControls
                    artist={song.artist} title={song.title} uiScale={uiScale} isTVMode={isTVMode}
                    onMinimize={onMinimize} scoreDisplayRef={scoringCtrl.scoreDisplayRef}
                    visiblePlayers={scoringCtrl.visiblePlayers} progressLineRef={scoringCtrl.progressLineRef}
                />

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, pt: 10 }}>
                    <SessionLyricsVisualizer
                        visiblePlayers={scoringCtrl.visiblePlayers} allPlayers={players} parsedSong={parsedSong!}
                        timeProxyRef={audioCtrl.timeProxyRef} lyricsUiScale={uiScale * activeLyricsScale}
                        activeLyricsZoom={activeLyricsZoom} activeLyricsLines={activeLyricsLines} activeLyricsPosition={activeLyricsPosition}
                        gridLayout={scoringCtrl.gridLayout} showDebugOverlay={settings.showDebugOverlay}
                        showNoteLabels={settings.showNoteLabels} uiScale={uiScale} onSwitchTrack={switchTrack}
                    />
                </Box>

                <SessionScoreOverlay
                    showDevSlider={settings.showDevSlider}
                    devPitchOverride={scoringCtrl.devPitchOverride}
                    onDevPitchChange={scoringCtrl.setDevPitchOverride}
                />
            </Box>

            {audioSrc && <audio ref={audioCtrl.audioRef} src={audioSrc} preload="auto" onEnded={handleSongEndBound} muted={muteAudio} onError={(e) => console.warn('[Session] Audio element load error:', e)} style={{ display: 'none' }} />}
            {vocalsSrc && <audio ref={audioCtrl.vocalsRef} src={vocalsSrc} preload="auto" muted={muteAudio} onError={(e) => console.warn('[Session] Vocals element load error:', e)} style={{ display: 'none' }} />}
            {!audioSrc && !isClient && <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>}

            <SessionPauseOverlay
                isPausedForScore={audioCtrl.isPausedForScore} suppressResults={suppressResults}
                players={players} onExit={onExit} onResume={audioCtrl.resumeFromScore}
                setIsPausedForScore={audioCtrl.setIsPausedForScore}
            />
        </Box>
    );
});
MelodiqSessionContent.displayName = 'MelodiqSessionContent';

export const MelodiqSession = forwardRef<MelodiqSessionHandle, MelodiqSessionProps>((props, ref) => (
    <ErrorBoundary fallback={<Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Typography variant="h5" color="error">Session Crashed</Typography><Button onClick={() => props.onExit(true)} sx={{ mt: 2 }} variant="contained">Exit</Button></Box>}>
        <MelodiqSessionContent {...props} ref={ref} />
    </ErrorBoundary>
));
MelodiqSession.displayName = 'MelodiqSession';
