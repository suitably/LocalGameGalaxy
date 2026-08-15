import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from 'react';
import { melodiqFetch } from '../api/melodiqFetch';
import { Box, Snackbar, Alert, Menu, MenuItem } from '@mui/material';
import { type Song, type SongMeta } from '../db';
import { MelodiqSession, type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { MiniPlayer } from './MiniPlayer';
import { useQueue } from '../hooks/useQueue';
import { useSongs } from '../hooks/useSongs';
import { useClientEngine } from '../PhoneClientEngine';

interface PlaybackManagerProps {
    selectedSong: Song | null;
    remoteSong: SongMeta | null;
    isTVConnected: boolean;
    currentView: string;
    onExitSession: (forceHome?: boolean) => void;
    onMinimizeSession: () => void;
    onRestoreSession: () => void;
    onSelectSong: (song: SongMeta, forcePlay?: boolean, participants?: any[]) => void;
    sendRemoteCommand: (command: string, value: any) => void;
    setRemoteSong: (song: SongMeta | null) => void;
    onShowQueue: () => void;
    sendGameUpdate?: (state: any) => void;
    /** Song that was playing before the last page reload, restored from localStorage */
    restoredSong?: SongMeta | null;
    /** Clears the restored song state in the parent once the user resumes */
    onClearRestoredSong?: () => void;
    /** True if this app is running in client/remote mode (no media rendering) */
    isClient?: boolean;
    /** The participants for the active song, from the queue */
    activeParticipants?: any[] | null;
    clientDeviceId?: string;
}

export interface PlaybackManagerHandle {
    togglePlay: () => void;
}

export const PlaybackManager = forwardRef<PlaybackManagerHandle, PlaybackManagerProps>((props, ref) => {
    const {
        selectedSong,
        remoteSong,
        isTVConnected,
        currentView,
        onExitSession,
        onMinimizeSession,
        onRestoreSession,
        onSelectSong,
        sendRemoteCommand,
        setRemoteSong,
        onShowQueue,
        sendGameUpdate,
        restoredSong = null,
        onClearRestoredSong,
        isClient = false,
        activeParticipants = null,
        clientDeviceId
    } = props;

    const { queue, popNext, setNowPlaying } = useQueue();
    const { refreshSongs, getSongById } = useSongs();

    const [prevSong, setPrevSong] = useState<Song | null>(null);
    const [playbackId, setPlaybackId] = useState<number>(0);

    if (selectedSong !== prevSong) {
        setPrevSong(selectedSong);
        setPlaybackId(id => id + 1);
    }
    const sessionRef = useRef<MelodiqSessionHandle>(null);
    const [playbackState, setPlaybackState] = useState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0
    });
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const initialTime = useMemo(() => {
        if (!selectedSong) return 0;
        if (typeof (selectedSong as any).currentTime === 'number' && (selectedSong as any).currentTime > 0) {
            return (selectedSong as any).currentTime;
        }
        try {
            const saved = JSON.parse(localStorage.getItem('melodiq_saved_time') || '{}');
            if (saved.id === selectedSong.id && saved.time > 0) return saved.time;
        } catch (e) {}
        try {
            const restored = JSON.parse(localStorage.getItem('melodiq_restored_song') || '{}');
            if (restored.id === selectedSong.id && restored.currentTime > 0) return restored.currentTime;
        } catch (e) {}
        return 0;
    }, [selectedSong]);

    const [contextMenu, setContextMenu] = useState<HTMLElement | null>(null);
    const [syncJobId, setSyncJobId] = useState<string | null>(null);
    const [syncTargetTime, setSyncTargetTime] = useState<number | null>(null);

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!selectedSong) return;
        event.preventDefault();
        event.stopPropagation();
        setSyncTargetTime(playbackState.currentTime);
        setContextMenu(event.currentTarget);
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleSyncHere = async () => {
        handleCloseContextMenu();
        if (!selectedSong) {
             setFeedbackMessage("Fehler: Kein lokaler Song");
             return;
        }
        
        const currentTime = syncTargetTime !== null ? syncTargetTime : playbackState.currentTime; // seconds
        
        try {
            setFeedbackMessage("KI Auto-Sync (Hybrid) gestartet...");
            
            const data = await melodiqFetch('/api/separator/job', {
                method: 'POST',
                body: JSON.stringify([{
                    songId: selectedSong.id,
                    type: 'auto-sync',
                    approximateStartSec: currentTime,
                    isPaused: !playbackState.isPlaying
                }])
            });
            
            if (data) {
                if (data.jobIds && data.jobIds.length > 0) {
                    setSyncJobId(data.jobIds[0]);
                }
                setFeedbackMessage('Song-Sync (Hybrid) wird im Hintergrund berechnet!');
            } else {
                setFeedbackMessage('Fehler beim Starten des Auto-Syncs');
            }
        } catch (err: any) {
            console.error(err);
            setFeedbackMessage(err.message);
        }
    };

    // sendClientCommand is used to control the remote session.
    const clientEngine = useClientEngine();
    const { sendClientCommand, isSessionPlaying } = isClient ? clientEngine : { sendClientCommand: undefined, isSessionPlaying: false };

    const canControlPlayback = true; // All users can control playback by default now
    const actualIsPlaying = isClient ? isSessionPlaying : playbackState.isPlaying;

    // Sync Job Polling
    useEffect(() => {
        if (!syncJobId) return;
        const interval = setInterval(async () => {
            try {
                const data = await melodiqFetch(`/api/separator/status/${syncJobId}`);
                if (data) {
                    if (data.status === 'done' || data.status === 'error') {
                        clearInterval(interval);
                        setSyncJobId(null);
                        if (data.status === 'done') {
                            setFeedbackMessage('Auto-Sync abgeschlossen! Neue Lyrics geladen.');
                            await refreshSongs();
                            if (selectedSong) {
                                const newSong = await getSongById(selectedSong.id);
                                if (newSong) onSelectSong(newSong, false, activeParticipants || undefined);
                            }
                        } else {
                            setFeedbackMessage('Fehler beim Auto-Sync: ' + (data.error || 'Unbekannt'));
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [syncJobId, refreshSongs, getSongById, selectedSong, onSelectSong, activeParticipants]);

    // Broadcast Game State Loop
    useEffect(() => {
        if (!sendGameUpdate || !selectedSong) {
            if (sendGameUpdate) {
                sendGameUpdate({ isPlaying: false, currentTime: 0, activeSongId: null, players: [] });
            }
            return;
        }

        const intervalId = setInterval(() => {
            if (sessionRef.current) {
                const state = sessionRef.current.getGameState();
                sendGameUpdate({ 
                    ...state, 
                    activeSongId: selectedSong.id,
                    activeSong: { id: selectedSong.id, title: selectedSong.title, artist: selectedSong.artist }
                });
            }
        }, 100);

        return () => {
            clearInterval(intervalId);
            sendGameUpdate({ isPlaying: false, currentTime: 0, activeSongId: null, players: [] });
        };
    }, [sendGameUpdate, selectedSong]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
        togglePlay: () => {
            if (selectedSong) {
                sessionRef.current?.togglePlay();
            }
        }
    }));

    // Handle MiniPlayer Next Logic
    const handleMiniPlayerNext = () => {
        if (isClient && sendClientCommand) {
            sendClientCommand('next');
            return;
        }

        if (selectedSong) {
            // Smart Skip: Delegate logic to Session
            if (sessionRef.current && sessionRef.current.handleNext()) {
                // Session handled it (paused for score).
                // Restore Session view so user sees the ScoreBoard (or so TV displays it)
                if (currentView !== 'Session' && !isTVConnected) {
                    onRestoreSession();
                }
                return;
            }

            // If session didn't handle it (already showing scores or finished), play next song or exit
            if (queue.length > 0 && queue[0].song.isDownloading) {
                setFeedbackMessage("Waiting for download to finish...");
                return;
            }
            const nextItem = popNext();
            if (nextItem) {
                onSelectSong(nextItem.song, true, nextItem.participants);
            } else {
                setNowPlaying(null);
                setPlaybackState({ isPlaying: false, currentTime: 0, duration: 0, progress: 0 });
                onExitSession();
            }
        } else if (remoteSong && isTVConnected) {
            sendRemoteCommand('NEXT', {});
            if (queue.length > 0 && queue[0].song.isDownloading) {
                setFeedbackMessage("Waiting for download to finish...");
                return;
            }
            const nextItem = popNext();
            if (nextItem) {
                onSelectSong(nextItem.song, true, nextItem.participants);
            } else {
                setRemoteSong(null);
            }
        } else {
             // Try to start from empty state
             if (queue.length > 0 && queue[0].song.isDownloading) {
                 setFeedbackMessage("Waiting for download to finish...");
                 return;
             }
             const nextItem = popNext();
             if (nextItem) {
                 onSelectSong(nextItem.song, true, nextItem.participants);
             }
        }
    };

    // Listen for local host commands (from proxy or UI)
    useEffect(() => {
        if (isClient) return; // Clients don't handle host commands locally

        const handleHostCommand = (e: any) => {
            const command = (e.detail.command || '').toLowerCase();
            if (command === 'play' || command === 'pause' || command === 'toggle') {
                if (selectedSong) {
                    sessionRef.current?.togglePlay();
                } else if (!selectedSong && queue.length > 0) {
                    handleMiniPlayerNext();
                }
            } else if (command === 'next') {
                handleMiniPlayerNext();
            }
        };

        window.addEventListener('melodiq_host_command', handleHostCommand);
        return () => window.removeEventListener('melodiq_host_command', handleHostCommand);
    }, [isClient, selectedSong, queue.length]);

;

    // Determine if we are in "restored" mode (page was reloaded while a song was playing)
    const isInRestoredMode = !selectedSong && !remoteSong && !!restoredSong;

    // The song to display in the MiniPlayer
    const miniPlayerSong = selectedSong || remoteSong || (isInRestoredMode ? restoredSong : (queue.length > 0 ? queue[0].song : null));

    // Handle Resume: load and start the restored song
    const handleResume = () => {
        if (restoredSong) {
            onClearRestoredSong?.();
            onSelectSong(restoredSong, true);
        }
    };

    const lastUpdateRef = useRef<number>(0);
    const lastStorageRef = useRef<number>(0);

    const handlePlaybackUpdate = useCallback((state: any) => {
        const now = Date.now();
        (window as any).__melodiq_current_time = state.currentTime;
        if (now - lastUpdateRef.current > 100) {
            setPlaybackState(state);
            lastUpdateRef.current = now;
            
            if (selectedSong && state.currentTime > 0 && (now - lastStorageRef.current > 1000)) {
                localStorage.setItem('melodiq_saved_time', JSON.stringify({ id: selectedSong.id, time: state.currentTime }));
                lastStorageRef.current = now;
            }
        }
    }, [selectedSong]);

    return (
        <>
            {/* Persistent Session (Hidden or Visible) */}
            {selectedSong && (
                <Box 
                    sx={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    pt: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))',
                    pb: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))',
                    pl: 'var(--safe-area-inset-left, env(safe-area-inset-left, 0px))',
                    pr: 'var(--safe-area-inset-right, env(safe-area-inset-right, 0px))',
                    zIndex: currentView === 'Session' ? 1400 : -1, // Below everything if hidden
                    visibility: currentView === 'Session' ? 'visible' : 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <MelodiqSession
                        key={`${selectedSong.id}-${playbackId}`}
                        ref={sessionRef}
                        song={selectedSong}
                        initialTime={initialTime}
                        onExit={(forceHome = false) => {
                            setNowPlaying(null);
                            localStorage.removeItem('melodiq_saved_time');
                            if (!forceHome) {
                                const nextItem = popNext();
                                if (nextItem) {
                                    onSelectSong(nextItem.song, true, nextItem.participants); // forcePlay=true
                                    return;
                                }
                            }
                            setPlaybackState({ isPlaying: false, currentTime: 0, duration: 0, progress: 0 });
                            onExitSession(); // Clears selectedSong in parent
                        }}
                        onMinimize={onMinimizeSession}
                        onPlaybackUpdate={handlePlaybackUpdate}
                        showDebugOverlay={false}
                        showDevSlider={false}
                        muteAudio={isTVConnected || isClient}
                        suppressResults={false}
                        isClient={isClient}
                        isPassive={isClient}
                        activeSessionOverride={activeParticipants}
                        clientDeviceId={clientDeviceId}
                    />
                </Box>
            )}

            {
                (currentView === 'Home') && (
                    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1500 }}>
                        <MiniPlayer
                            song={miniPlayerSong}
                            isPlaying={actualIsPlaying}
                            progress={isInRestoredMode ? 0 : playbackState.progress}
                            onTogglePlay={() => {
                                if (isInRestoredMode) {
                                    handleResume();
                                } else if (isClient && sendClientCommand) {
                                    sendClientCommand(actualIsPlaying ? 'pause' : 'play');
                                } else if (selectedSong) {
                                    sessionRef.current?.togglePlay();
                                    if (!actualIsPlaying && !isTVConnected) {
                                        onRestoreSession();
                                    }
                                } else if (remoteSong && isTVConnected) {
                                    setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
                                    if (actualIsPlaying) {
                                        sendRemoteCommand('PAUSE', {});
                                    } else {
                                        sendRemoteCommand('RESUME', {});
                                    }
                            } else {
                                // No song selected, try to play from queue
                                handleMiniPlayerNext();
                            }
                        }}
                        onNext={handleMiniPlayerNext}
                        onMaximize={() => {
                            if (selectedSong) {
                                onRestoreSession();
                            } else {
                                // If remote, show feedback
                                setFeedbackMessage("Playing on TV");
                            }
                        }}
                        onShowQueue={onShowQueue}
                        queueLength={queue.length}
                        isRestored={isInRestoredMode}
                        isClient={isClient}
                        onMenuClick={handleMenuClick}
                        canControlPlayback={canControlPlayback}
                    />
                    </Box>
                )
            }

            {/* Local Feedback for PlaybackManager interactions */}
            <Snackbar
                open={!!feedbackMessage}
                autoHideDuration={3000}
                onClose={() => setFeedbackMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="info" onClose={() => setFeedbackMessage(null)}>
                    {feedbackMessage}
                </Alert>
            </Snackbar>

            <Menu
                open={Boolean(contextMenu)}
                onClose={handleCloseContextMenu}
                anchorEl={contextMenu}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
            >
                <MenuItem onClick={handleSyncHere}>Startzeit hier setzen (Sync)</MenuItem>
            </Menu>
        </>
    );
});

PlaybackManager.displayName = 'PlaybackManager';
