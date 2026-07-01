import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Box, Snackbar, Alert, Menu, MenuItem } from '@mui/material';
import { type Song, type SongMeta } from '../db';
import { MelodiqSession, type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { MiniPlayer } from './MiniPlayer';
import { useQueue } from '../hooks/useQueue';
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
    const sessionRef = useRef<MelodiqSessionHandle>(null);
    const [playbackState, setPlaybackState] = useState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        progress: 0
    });
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);

    const handleContextMenu = (event: React.MouseEvent) => {
        if (!selectedSong) return;
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
                : null,
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleSyncHere = async () => {
        handleCloseContextMenu();
        if (!selectedSong || !selectedSong.txtPath) {
             setFeedbackMessage("Fehler: Kein lokaler Song oder keine .txt Datei");
             return;
        }
        
        const currentTime = playbackState.currentTime; // seconds
        
        try {
            setFeedbackMessage("KI Auto-Sync (Hybrid) gestartet...");
            
            const helperUrl = (localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000').replace(/\/$/, "");
            const token = localStorage.getItem('melodiq_helper_token') || '';
            
            const res = await fetch(`${helperUrl}/api/separator/job`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                    songId: selectedSong.id,
                    songDir: selectedSong.txtPath ? selectedSong.txtPath.replace(/\/[^/]+$/, '') : undefined,
                    audioFile: selectedSong.audio ? selectedSong.audio.split('/').pop()?.split('?')[0] : undefined,
                    txtFile: selectedSong.txtPath ? selectedSong.txtPath.split('/').pop() : undefined,
                    safeName: selectedSong.title,
                    type: 'auto-sync',
                    approximateStartSec: currentTime
                }])
            });
            
            if (res.ok) {
                setFeedbackMessage('Song-Sync (Hybrid) wird im Hintergrund berechnet!');
            } else {
                setFeedbackMessage('Fehler beim Starten des Auto-Syncs');
            }
        } catch (err: any) {
            console.error(err);
            setFeedbackMessage(err.message);
        }
    };

    // Get client game state for remote playback sync
    const { gameState: clientGameState, sendClientCommand } = isClient ? useClientEngine() : { gameState: null, sendClientCommand: undefined };

    // Broadcast Game State Loop
    useEffect(() => {
        if (!sendGameUpdate || !selectedSong) {
            if (sendGameUpdate) {
                sendGameUpdate({ isPlaying: false, currentTime: 0, activeSongId: null });
            }
            return;
        }

        let frameId: number;
        let lastSendTime = 0;
        const loop = (time: number) => {
            if (sessionRef.current && (time - lastSendTime > 100)) {
                const state = sessionRef.current.getGameState();
                sendGameUpdate({ ...state, activeSongId: selectedSong.id });
                lastSendTime = time;
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(frameId);
            sendGameUpdate({ isPlaying: false, currentTime: 0, activeSongId: null });
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

    // Determine if we are in "restored" mode (page was reloaded while a song was playing)
    const isInRestoredMode = !selectedSong && !remoteSong && !!restoredSong;

    // The song to display in the MiniPlayer
    const miniPlayerSong = selectedSong || remoteSong || (isInRestoredMode ? restoredSong : null);

    // Handle Resume: load and start the restored song
    const handleResume = () => {
        if (restoredSong) {
            onClearRestoredSong?.();
            onSelectSong(restoredSong, true);
        }
    };

    return (
        <>
            {/* Persistent Session (Hidden or Visible) */}
            {selectedSong && (
                <Box 
                    onContextMenu={handleContextMenu}
                    sx={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: currentView === 'Session' ? 1400 : -1, // Below everything if hidden
                    visibility: currentView === 'Session' ? 'visible' : 'hidden',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <MelodiqSession
                        key={selectedSong.id}
                        ref={sessionRef}
                        song={selectedSong}
                        onExit={(forceHome = false) => {
                            setNowPlaying(null);
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
                        onPlaybackUpdate={setPlaybackState}
                        showDebugOverlay={false}
                        showDevSlider={false}
                        muteAudio={isTVConnected || isClient}
                        suppressResults={false}
                        isClient={isClient}
                        isPassive={isClient}
                        passiveState={isClient ? clientGameState : undefined}
                        activeSessionOverride={activeParticipants}
                        clientDeviceId={clientDeviceId}
                    />
                </Box>
            )}

            {/* Mini Player - Local OR Remote OR Restored */}
            {
                currentView === 'Home' && (
                    <MiniPlayer
                        song={miniPlayerSong}
                        isPlaying={playbackState.isPlaying}
                        progress={isInRestoredMode ? 0 : playbackState.progress}
                        onTogglePlay={() => {
                            if (isInRestoredMode) {
                                handleResume();
                            } else if (isClient && sendClientCommand) {
                                sendClientCommand('play');
                            } else if (selectedSong) {
                                if (sessionRef.current?.isFinished) {
                                    handleMiniPlayerNext();
                                } else {
                                    sessionRef.current?.togglePlay();
                                }
                            } else if (remoteSong && isTVConnected) {
                                // Toggle remote playback state locally for UI
                                setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
                                // Send command
                                if (playbackState.isPlaying) {
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
                        onContextMenu={handleContextMenu}
                    />
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
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    contextMenu !== null
                        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
                        : undefined
                }
            >
                <MenuItem onClick={handleSyncHere}>Startzeit hier setzen (Sync)</MenuItem>
            </Menu>
        </>
    );
});

PlaybackManager.displayName = 'PlaybackManager';
