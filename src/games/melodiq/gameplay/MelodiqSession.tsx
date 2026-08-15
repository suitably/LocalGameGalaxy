import React, { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Box, Button, Typography, IconButton, Slider, Snackbar, Alert } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { type Song } from '../db';
import { type PassiveGameState } from '../types';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';
import { ScoreBoard } from './ScoreBoard';
import { ScoreDisplay, type ScoreDisplayHandle } from './ScoreDisplay';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import { useWebRTC } from '../audio/WebRTCContext';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

import { useMediaLoaders } from './hooks/useMediaLoaders';
import { useSessionPlayers } from './hooks/useSessionPlayers';
import { useScoringEngine } from './hooks/useScoringEngine';
import { usePassiveSync } from './hooks/usePassiveSync';
import { useSessionEnd } from './hooks/useSessionEnd';
import { usePlaybackControls } from './hooks/usePlaybackControls';
import { useLocalMediaSync } from './hooks/useLocalMediaSync';

export interface MelodiqSessionHandle {
    togglePlay: () => void;
    isPlaying: boolean;
    getDuration: () => number;
    getCurrentTime: () => number;
    finishSong: () => void;
    isFinished: boolean;
    pauseForScore: () => void;
    resumeFromScore: () => void;
    isPausedForScore: boolean;
    handleNext: () => boolean;
    getGameState: () => PassiveGameState;
}

export interface MelodiqSessionProps {
    song: Song;
    initialTime?: number;
    onExit: (forceHome?: boolean) => void;
    onMinimize?: () => void;
    onPlaybackUpdate?: (state: { isPlaying: boolean; currentTime: number; duration: number; progress: number }) => void;
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
    isTVMode?: boolean;
    muteAudio?: boolean;
    isPassive?: boolean;
    passiveState?: PassiveGameState | null;
    activeSessionOverride?: any[] | null;
    suppressResults?: boolean;
    uiScale?: number;
    isClient?: boolean;
    clientDeviceId?: string;
}

const DEFAULT_TRACK_SCORE_WEIGHTS = [1, 1];

const MelodiqSessionContent = forwardRef(({ song, initialTime, onExit, onMinimize, onPlaybackUpdate, isTVMode = false, muteAudio = false, isPassive = false, passiveState, activeSessionOverride = null, suppressResults = false, uiScale = 1.0, isClient = false, clientDeviceId }: MelodiqSessionProps, ref: React.ForwardedRef<MelodiqSessionHandle>): React.ReactNode => {
    const { settings } = useMelodiqSettings();
    const {
        showDebugOverlay,
        showDevSlider,
        showNoteLabels,
        showVideoErrors,
        songVolume,
        masterVolume,
        goldenNoteMultiplier,
        bpmMultiplier = 1,
        trackScoreWeights = DEFAULT_TRACK_SCORE_WEIGHTS,
        hideBackgroundVideo,
        fallbackBackgroundUrl
    } = settings as any;

    const { manager, activePeers } = useWebRTC();

    const activeLyricsScale = (isPassive && passiveState?.lyricsScale !== undefined)
        ? passiveState.lyricsScale
        : (settings.lyricsScale ?? 1.0);
    const activeLyricsZoom = (isPassive && passiveState?.enableLyricsZoom !== undefined)
        ? passiveState.enableLyricsZoom
        : (settings.enableLyricsZoom ?? false);
    const activeLyricsPosition = (isPassive && passiveState?.lyricsPosition !== undefined)
        ? passiveState.lyricsPosition
        : (settings.lyricsPosition ?? 'bottom');
    const lyricsUiScale = uiScale * activeLyricsScale;

    // Local State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [isPausedForScore, setIsPausedForScore] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [_duration, setDuration] = useState(0);
    const [passivePlayBlocked, setPassivePlayBlocked] = useState(false);
    
    // Song Parsing State
    const [parsedSong, setParsedSong] = useState<SongWithNotes | null>(null);
        
    const [contentLoading, setContentLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const vocalsRef = useRef<HTMLAudioElement>(null);
    const scoreDisplayRef = useRef<ScoreDisplayHandle>(null);
    const progressLineRef = useRef<HTMLDivElement>(null);
    const virtualTimeRef = useRef<number>(0);
    
    // Derived Ref
    const isPlayingRef = useRef(isPlaying);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Parse Song Effect
    useEffect(() => {
        let mounted = true;
        const loadParsedData = async () => {
            setContentLoading(true);
            setLoadError(null);
            try {
                if (!song.txtContent) {
                    throw new Error("No UltraStar TXT found for this song.");
                }
                const text = song.txtContent;
                const parsed = parseUltraStarTxt(text);
                if (mounted && parsed) setParsedSong(parsed as any);
            } catch (e) {
                console.error("Failed to parse song TXT", e);
                if (mounted) setLoadError("Failed to parse song format.");
            } finally {
                if (mounted) setContentLoading(false);
            }
        };
        loadParsedData();
        return () => { mounted = false; };
    }, [song.id, song.txtContent]);

    // Hooks
    const {
        audioSrc,
        videoSrc,
        vocalsSrc,
        needsFolderAccess,
        videoError,
        setVideoError,
        folderInputRef,
        handleFolderInputChange
    } = useMediaLoaders(song, parsedSong, isClient, settings.audioPlaybackMode ?? 'separated');

    // Preserve playback timestamp when audio source changes dynamically (e.g. changing settings)
    const prevAudioSrcRef = useRef(audioSrc);
    useEffect(() => {
        if (prevAudioSrcRef.current && prevAudioSrcRef.current !== audioSrc && audioRef.current) {
            const currentPosition = audioRef.current.currentTime || 0;
            const wasPlaying = isPlaying;
            const targetAudio = audioRef.current;

            const handleLoaded = async () => {
                if (targetAudio) {
                    targetAudio.currentTime = currentPosition;
                    if (vocalsRef.current) vocalsRef.current.currentTime = currentPosition;
                    if (wasPlaying) {
                        try {
                            await targetAudio.play();
                            if (vocalsRef.current) vocalsRef.current.play().catch(() => {});
                        } catch (e) {
                            console.warn("Playback resume failed on source change", e);
                        }
                    }
                }
            };

            targetAudio.addEventListener('loadedmetadata', handleLoaded, { once: true });
        }
        prevAudioSrcRef.current = audioSrc;
    }, [audioSrc, isPlaying]);

    const switchTrack = useCallback((playerIndex: number, trackIndex: number) => {
        setPlayers(prev => {
            const newPlayers = [...prev];
            const p = newPlayers[playerIndex];
            if (p) {
                const safeIndex = (parsedSong?.tracks && trackIndex < parsedSong.tracks.length) ? trackIndex : 0;
                p.trackIndex = safeIndex;
                p.activeSegments = {};
            }
            return newPlayers;
        });
    }, [parsedSong]);

    const {
        togglePlay,
        pauseForScore,
        resumeFromScore,
        handleNext,
        safePlay,
    } = usePlaybackControls({
        audioRef, vocalsRef, videoRef,
        isPlaying, setIsPlaying,
        isFinished,
        isPausedForScore, setIsPausedForScore,
        muteAudio, songVolume, masterVolume,
        vocalsVolume: settings.vocalsVolume ?? 1.0
    });

    const { players, setPlayers, playersRef, ready } = useSessionPlayers({
        manager,
        activePeers,
        parsedSong,
        song,
        switchTrack,
        setResults,
        onExit,
        audioRef,
        videoRef,
        activeSessionOverride,
        isPassive
    });

    const { handleSongEnd: handleSongEndBound } = useSessionEnd({
        playersRef, song, setResults, setIsFinished, setIsPlaying, videoRef, isTVMode
    });

    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);

    const activeParticipantKeys = useMemo(() => {
        const session = activeSessionOverride || JSON.parse(localStorage.getItem('melodiq_active_session') || '[]');
        const keys = new Set<string>();
        if (Array.isArray(session)) {
            session.forEach((p: any) => {
                if (p.profileId) keys.add(p.profileId);
                if (p.deviceId) keys.add(p.deviceId);
            });
        }
        return keys;
    }, [activeSessionOverride]);

    useScoringEngine({
        players, ready, audioRef, vocalsRef, videoRef, scoreDisplayRef, progressLineRef, isPlayingRef,
        parsedSong, bpmMultiplier, trackScoreWeights, goldenNoteMultiplier, devPitchOverride,
        isPassive, passiveState, isClient, _duration, onPlaybackUpdate, virtualTimeRef
    });

    usePassiveSync({
        isPassive, passiveState: passiveState || null, isClient, isTVMode, players, setPlayers, playersRef, scoreDisplayRef, audioRef, videoRef,
        isPlayingRef, setIsPlaying, setIsFinished, setIsPausedForScore, setPassivePlayBlocked, virtualTimeRef
    });

    useLocalMediaSync({ audioRef, videoRef, vocalsRef, isPlaying });

    // Audio Metadata
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audioSrc) {
            audio.onloadedmetadata = () => setDuration(audio.duration);
        }
    }, [audioSrc]);

    // Keyboard controls
    const resetUITimer = useCallback(() => {}, []); // Add UI visible logic if needed
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
            if (vocalsRef.current) vocalsRef.current.pause();
            if (videoRef.current) videoRef.current.pause();
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
                return;
            }

            switch (e.key) {
                case ' ':
                case 'MediaPlayPause':
                    e.preventDefault();
                    e.stopPropagation();
                    (document.activeElement as HTMLElement)?.blur();
                    if (isFinished || isPausedForScore) {
                        onExit(false);
                    } else {
                        togglePlay();
                    }
                    break;
                case 'ArrowRight':
                case 'MediaFastForward':
                    if (audioRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
                        resetUITimer();
                    }
                    break;
                case 'ArrowLeft':
                case 'MediaRewind':
                    if (audioRef.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                        resetUITimer();
                    }
                    break;
                case 'Escape':
                case 'Backspace':
                    e.preventDefault();
                    e.stopPropagation();
                    onExit();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [togglePlay, onExit, resetUITimer]);

    // Auto-start logic
    const hasStartedRef = useRef(false);
    useEffect(() => {
        if (!hasStartedRef.current && ready && !contentLoading && parsedSong && audioSrc && audioRef.current && !isFinished) {
            hasStartedRef.current = true;
            if (initialTime && initialTime > 0) {
                audioRef.current.currentTime = initialTime;
                if (videoRef.current) videoRef.current.currentTime = initialTime;
                if (vocalsRef.current) vocalsRef.current.currentTime = initialTime;
            }
            const startPlay = async () => {
                try { await safePlay(); } catch (e) { hasStartedRef.current = false; }
            };
            startPlay();
        }
    }, [ready, contentLoading, parsedSong, audioSrc, song.id, isFinished, safePlay, initialTime]);

    // Dynamic Volume Sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muteAudio ? 0 : (songVolume * masterVolume);
        }
        if (vocalsRef.current) {
            vocalsRef.current.volume = muteAudio ? 0 : ((settings.vocalsVolume ?? 1.0) * masterVolume);
        }
    }, [muteAudio, songVolume, masterVolume, settings.vocalsVolume]);

    // Immediate playback update trigger
    useEffect(() => {
        if (onPlaybackUpdate) {
            onPlaybackUpdate({
                isPlaying: isPassive && passiveState ? passiveState.isPlaying : isPlaying,
                currentTime: audioRef.current?.currentTime || 0,
                duration: audioRef.current?.duration || 0,
                progress: audioRef.current?.duration ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0
            });
        }
    }, [isPlaying, isPassive, passiveState?.isPlaying, onPlaybackUpdate]);

    useImperativeHandle(ref, () => ({
        togglePlay,
        isPlaying,
        getDuration: () => audioRef.current?.duration || 0,
        getCurrentTime: () => audioRef.current?.currentTime || 0,
        finishSong: handleSongEndBound,
        isFinished,
        pauseForScore,
        resumeFromScore,
        isPausedForScore,
        handleNext,
        getGameState: () => ({
            isPlaying,
            isFinished,
            isPausedForScore,
            lyricsScale: settings.lyricsScale ?? 1.0,
            enableLyricsZoom: settings.enableLyricsZoom ?? false,
            lyricsPosition: settings.lyricsPosition ?? 'bottom',
            players: playersRef.current.map(p => ({
                config: p.config,
                id: p.config.id,
                name: p.config.name,
                hue: p.config.hue,
                score: p.score,
                trackScores: p.trackScores,
                currentPitch: p.pitchRef.current,
                activeSegments: p.activeSegments,
                combo: p.combo,
                lastHit: p.lastHit
            })),
            currentTime: audioRef.current?.currentTime || 0
        })
    }), [togglePlay, isPlaying, handleSongEndBound, isFinished, pauseForScore, resumeFromScore, isPausedForScore, handleNext, playersRef, settings.lyricsScale, settings.enableLyricsZoom, settings.lyricsPosition]);

    const timeProxyRef = React.useMemo(() => ({
        current: {
            get currentTime() { return isClient ? virtualTimeRef.current : (audioRef.current?.currentTime || 0); },
            get paused() { return !isPlayingRef.current; },
            get isFinished() { return isFinished; },
            get ended() { return isFinished; },
            get readyState() { return isClient ? 4 : (audioRef.current?.readyState || 0); }
        }
    }), [isClient, isFinished]) as any;

    if (loadError) {
        return (
            <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
                <Typography variant="h6" color="error" align="center">{loadError}</Typography>
                <Button variant="contained" onClick={() => onExit(true)}>Go Back</Button>
            </Box>
        );
    }

    if (!isPausedForScore && (!ready || contentLoading || !parsedSong)) return <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Loading...</Typography></Box>;

    if (needsFolderAccess) {
        return (
            <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <Typography variant="h5">{song.artist} - {song.title}</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
                    This song was imported without persistent file access.<br />
                    To play, please select the same folder you imported from.
                </Typography>
                <input ref={folderInputRef} type="file" {...{webkitdirectory:""}} style={{ display: 'none' }} onChange={handleFolderInputChange} />
                <Button variant="contained" onClick={() => folderInputRef.current?.click()}>Select Song Folder</Button>
                <Button variant="text" color="inherit" onClick={() => onExit(true)}>Go Back</Button>
            </Box>
        );
    }

    if (isFinished && !suppressResults) {
        return <ScoreBoard players={results.length > 0 ? results : players.map(p => ({ config: p.config, score: p.score, history: [], isNewRecord: false }))} onExit={onExit} isPassive={isPassive} onMinimize={onMinimize} />;
    }





    let visiblePlayers = players.filter(p => {
        if (p.config.isRemote && !(p.mic || p.webRtcManager)) return false;
        if (p.config.hidePitch) return false;

        // Central participant filter: if an active session list is defined, player must be in it
        if (activeParticipantKeys.size > 0) {
            const devId = p.config.deviceId;
            const profId = p.config.id;
            const peerId = p.remotePeerId;
            const isInActiveSession = (profId && activeParticipantKeys.has(profId)) ||
                                      (devId && activeParticipantKeys.has(devId)) ||
                                      (peerId && activeParticipantKeys.has(peerId));
            if (!isInActiveSession) return false;
        }

        return true;
    });

    if (isClient && clientDeviceId) {
        // Phone client should only see themselves (or nothing if they are a spectator/hidePitch is true)
        visiblePlayers = visiblePlayers.filter(p => p.config.deviceId === clientDeviceId);
    }
    
    let gridLayout = { rows: [1], columnWidthPercent: 100 };
    const numPlayers = visiblePlayers.length;
    
    let layoutRule = settings.customLayouts ? settings.customLayouts[numPlayers] : '';

    if (layoutRule === '0') {
        visiblePlayers = [];
    }

    if (layoutRule && layoutRule !== 'auto' && layoutRule !== '0') {
        const rows = layoutRule.split(/[\.\-]/).map(Number).filter(n => !isNaN(n) && n > 0);
        if (rows.length > 0) {
            const maxCols = Math.max(...rows);
            gridLayout = { rows, columnWidthPercent: 100 / maxCols };
        } else {
            layoutRule = ''; // Fallback to auto
        }
    } 
    
    if (!layoutRule || layoutRule === 'auto') {
        if (numPlayers > 0) {
            const cols = Math.ceil(Math.sqrt(numPlayers));
            const numRows = Math.ceil(numPlayers / cols);
            const rows = Array(numRows).fill(cols);
            const remainder = numPlayers % cols;
            if (remainder !== 0) {
                rows[numRows - 1] = remainder;
            }
            gridLayout = { rows, columnWidthPercent: 100 / cols };
        } else {
            gridLayout = { rows: [], columnWidthPercent: 100 };
        }
    }

    const isUIVisible = true;

    return (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'black', color: 'white', zIndex: 1300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {videoSrc && !hideBackgroundVideo && (
                <video ref={videoRef} src={videoSrc} muted style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 1.0 }} onError={(e) => {
                    console.warn("Video playback failed.", e);
                    setVideoError("Video format not supported");
                }} />
            )}
            {!videoSrc && !hideBackgroundVideo && fallbackBackgroundUrl && (
                fallbackBackgroundUrl.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                    <video src={fallbackBackgroundUrl} autoPlay loop muted style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 1.0 }} />
                ) : (
                    <img src={fallbackBackgroundUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, opacity: 1.0 }} alt="Background" />
                )
            )}
            <Snackbar open={!!videoError && showVideoErrors} autoHideDuration={6000} onClose={() => setVideoError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setVideoError(null)} severity="warning" sx={{ width: '100%' }}>{videoError}</Alert>
            </Snackbar>
            {passivePlayBlocked && isPassive && (
                <Box onClick={async () => {
                    try {
                        if (audioRef.current && passiveState?.currentTime) {
                            audioRef.current.currentTime = passiveState.currentTime;
                            if (videoRef.current) videoRef.current.currentTime = passiveState.currentTime;
                        }
                        await audioRef.current?.play();
                        videoRef.current?.play().catch(() => {});
                        setIsPlaying(true);
                        setPassivePlayBlocked(false);
                    } catch (e) { }
                }} sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, bgcolor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 2 }}>
                    <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>🔇 Audio blocked</Typography>
                    <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)' }}>Tap anywhere to start playback</Typography>
                </Box>
            )}

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 20, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)', pointerEvents: isUIVisible ? 'auto' : 'none', opacity: isUIVisible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {onMinimize && !isTVMode && (
                            <IconButton onClick={onMinimize} color="inherit" sx={{ ml: 1 }}><KeyboardArrowDownIcon /></IconButton>
                        )}
                    </Box>
                    <Typography variant="h6" sx={{ fontSize: `${1.25 * uiScale}rem` }}>{song.artist} - {song.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 4, pointerEvents: 'none' }}>
                        <ScoreDisplay ref={scoreDisplayRef} players={visiblePlayers.map(p => ({ id: p.config.id, name: p.config.name, hue: p.config.hue }))} scale={uiScale} />
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, pt: 10 }}>
                    {visiblePlayers.length === 0 ? (
                        // No active singers: lyrics placed according to lyricsPosition setting ('bottom' or 'center')
                        <Box sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: activeLyricsPosition === 'bottom' ? 'flex-end' : 'center',
                            minHeight: 0,
                            overflow: 'hidden',
                            px: 2,
                            pb: activeLyricsPosition === 'bottom' ? { xs: 2, md: 4 } : 0
                        }}>
                            <Box sx={{
                                width: '100%',
                                maxWidth: '100%',
                                bgcolor: activeLyricsPosition === 'bottom' ? 'rgba(0,0,0,0.25)' : 'transparent',
                                borderTop: activeLyricsPosition === 'bottom' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                borderRadius: activeLyricsPosition === 'bottom' ? 2 : 0,
                                py: activeLyricsPosition === 'bottom' ? 1 : 0
                            }}>
                                <LyricsDisplay song={parsedSong!} audioRef={timeProxyRef} uiScale={lyricsUiScale * (activeLyricsPosition === 'bottom' ? 1.0 : 1.2)} enableZoom={activeLyricsZoom} />
                            </Box>
                        </Box>
                    ) : (
                        // Active singers: pitch visualizer grid + lyrics strip at bottom
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', minHeight: 0, alignContent: 'stretch' }}>
                                {visiblePlayers.map((player, idx) => {
                                    let remaining = idx;
                                    let rowIndex = 0;
                                    let colIndex = 0;
                                    let colsInRow = 1;
                                    for (let i = 0; i < gridLayout.rows.length; i++) {
                                        if (remaining < gridLayout.rows[i]) {
                                            rowIndex = i;
                                            colIndex = remaining;
                                            colsInRow = gridLayout.rows[i];
                                            break;
                                        }
                                        remaining -= gridLayout.rows[i];
                                    }

                                    const widthPercent = 100 / colsInRow;
                                    const heightPercent = 100 / gridLayout.rows.length;

                                    return (
                                        <Box key={player.config.id} sx={{
                                            width: `${widthPercent}%`,
                                            height: `${heightPercent}%`,
                                            minHeight: 0,
                                            position: 'relative',
                                            borderRight: colIndex < colsInRow - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                                            borderBottom: rowIndex < gridLayout.rows.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                        }}>
                                            <PitchVisualizer song={parsedSong!} audioRef={timeProxyRef} currentPitchRef={player.pitchRef} sungSegmentsRef={player.segmentsRef} showDebugOverlay={showDebugOverlay} label={player.config.name} hue={player.config.hue} showNoteLabels={showNoteLabels} latency={player.config.latency} trackIndex={player.trackIndex} scale={uiScale} />
                                            {parsedSong?.tracks && parsedSong.tracks.length > 1 && (
                                                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, pointerEvents: 'auto' }}>
                                                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, p: 0.5, display: 'flex', gap: 0.5 }}>
                                                        {parsedSong.tracks.map((t: any, tIdx: number) => (
                                                            <Button key={tIdx} variant={player.trackIndex === tIdx ? "contained" : "text"} size="small" sx={{ minWidth: 30, p: '2px 8px', fontSize: '0.75rem', bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 40%)` : 'transparent', color: 'white', '&:hover': { bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 50%)` : 'rgba(255,255,255,0.1)' } }} onClick={() => switchTrack(players.indexOf(player), tIdx)}>
                                                                {t.name || `P${tIdx + 1}`}
                                                            </Button>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                            <Box sx={{ flexShrink: 0, width: '100%', pointerEvents: 'none', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.2)', position: 'relative' }}>
                                <LyricsDisplay song={parsedSong!} audioRef={timeProxyRef} uiScale={lyricsUiScale} enableZoom={activeLyricsZoom} />
                            </Box>
                        </Box>
                    )}
                </Box>



                {showDevSlider && (
                    <Box sx={{ width: 400, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 2, borderRadius: 2, pointerEvents: 'auto', mt: 2 }}>
                        <Typography width={140}>P1 Dev Pitch: {Math.round(devPitchOverride || 0)}</Typography>
                        <Slider value={devPitchOverride || 60} min={36} max={84} onChange={(_, v) => setDevPitchOverride(v as number)} />
                        <Button onClick={() => setDevPitchOverride(null)} variant="outlined" size="small">Reset</Button>
                    </Box>
                )}
            </Box>

            {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={handleSongEndBound} muted={muteAudio} style={{ display: 'none' }} />}
            {vocalsSrc && <audio ref={vocalsRef} src={vocalsSrc} muted={muteAudio} style={{ display: 'none' }} />}
            {!audioSrc && !isClient && <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>}

            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, bgcolor: 'rgba(255,255,255,0.2)', zIndex: 100, pointerEvents: 'none', opacity: isUIVisible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
                <Box ref={progressLineRef} sx={{ width: '0%', height: '100%', background: 'linear-gradient(90deg, #ff4081 0%, #7c4dff 100%)', boxShadow: '0 0 10px currentColor', transition: 'width 0.1s linear' }} />
            </Box>

            {isPausedForScore && !suppressResults && (() => {
                const pausedPlayers = players.map(p => ({ config: p.config, score: Math.round(p.trackScores[p.trackIndex] || 0), history: [], isNewRecord: false }));
                return <ScoreBoard players={pausedPlayers} onExit={(forceHome) => { setIsPausedForScore(false); onExit(forceHome); }} onResume={resumeFromScore} />;
            })()}
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
