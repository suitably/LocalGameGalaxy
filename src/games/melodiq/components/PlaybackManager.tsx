import { useState, useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { type Song, type SongMeta } from '../db';
import { MelodiqSession, type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { MiniPlayer } from './MiniPlayer';
import { useQueue } from '../hooks/useQueue';
import { useClientEngine } from '../PhoneClientEngine';
import { useTranslation } from 'react-i18next';

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
    sessionInstanceId?: number;
    /** Notifies parent when playback play/pause state changes */
    onPlayingChange?: (isPlaying: boolean) => void;
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
        clientDeviceId,
        sessionInstanceId = 0,
        onPlayingChange
    } = props;

    const { t } = useTranslation();
    const { queue, popNext, setNowPlaying } = useQueue();

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
        if (restoredSong && restoredSong.id === selectedSong.id && typeof (restoredSong as any).currentTime === 'number' && (restoredSong as any).currentTime > 0) {
            return (restoredSong as any).currentTime;
        }
        return 0;
    }, [selectedSong, restoredSong]);

    // sendClientCommand is used to control the remote session.
    const clientEngine = useClientEngine();
    const { sendClientCommand, isSessionPlaying } = isClient ? clientEngine : { sendClientCommand: undefined, isSessionPlaying: false };

    const canControlPlayback = true; // All users can control playback by default now
    const actualIsPlaying = isClient ? isSessionPlaying : (Boolean(selectedSong || remoteSong) && playbackState.isPlaying);

    useEffect(() => {
        onPlayingChange?.(actualIsPlaying);
        return () => {
            onPlayingChange?.(false);
        };
    }, [actualIsPlaying, onPlayingChange]);

    // Broadcast Game State: piggyback on handlePlaybackUpdate instead of a separate interval
    // This ref allows the playback callback to access broadcast without being a dependency
    const sendGameUpdateRef = useRef(sendGameUpdate);
    const selectedSongRef = useRef(selectedSong);
    
    useEffect(() => {
        sendGameUpdateRef.current = sendGameUpdate;
        selectedSongRef.current = selectedSong;
    });

    // Send stop state when song is deselected or sendGameUpdate changes
    useEffect(() => {
        if (!sendGameUpdate || !selectedSong) {
            if (sendGameUpdate) {
                sendGameUpdate({ isPlaying: false, currentTime: 0, activeSongId: null, players: [] });
            }
            return;
        }
        return () => {
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
            localStorage.removeItem('melodiq_saved_time');
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
        
        // Broadcast game state to TV (replaces the old separate setInterval loop)
        const song = selectedSongRef.current;
        if (sendGameUpdateRef.current && song) {
            sendGameUpdateRef.current({ 
                ...state, 
                activeSongId: song.id,
                activeSong: { id: song.id, title: song.title, artist: song.artist }
            });
        }
        
        // Update isPlaying immediately (state change), but throttle progress updates to ~1/s
        setPlaybackState(prev => {
            const isPlayingChanged = state.isPlaying !== prev.isPlaying;
            if (isPlayingChanged || now - lastUpdateRef.current > 1000) {
                lastUpdateRef.current = now;
                return state;
            }
            return prev;
        });
            
        if (selectedSong && state.currentTime > 0 && (now - lastStorageRef.current > 1000)) {
            localStorage.setItem('melodiq_saved_time', JSON.stringify({ id: selectedSong.id, time: state.currentTime }));
            lastStorageRef.current = now;
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
                        key={`${selectedSong.id}-${sessionInstanceId}`}
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
                                setFeedbackMessage(t('melodiq.playing_on_tv'));
                            }
                        }}
                        onShowQueue={onShowQueue}
                        queueLength={queue.length}
                        isRestored={isInRestoredMode}
                        isClient={isClient}
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
        </>
    );
});

PlaybackManager.displayName = 'PlaybackManager';
