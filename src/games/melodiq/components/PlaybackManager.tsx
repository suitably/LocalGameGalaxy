import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
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
    onSelectSong: (song: SongMeta, forcePlay?: boolean) => void;
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
        isClient = false
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

    // Get client game state for remote playback sync
    const { gameState: clientGameState, sendClientCommand } = isClient ? useClientEngine() : { gameState: null, sendClientCommand: undefined };

    // Broadcast Game State Loop
    useEffect(() => {
        if (!sendGameUpdate || !selectedSong) return;

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
        return () => cancelAnimationFrame(frameId);
    }, [isTVConnected, sendGameUpdate, selectedSong]);

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
            if (isTVConnected) {
                // In TV mode, results are suppressed — skip the score pause entirely and
                // jump straight to the next queued song (or exit).
                const nextItem = popNext();
                if (nextItem) {
                    onSelectSong(nextItem.song, true);
                } else {
                    // No next song: finish the current session normally
                    sessionRef.current?.finishSong();
                }
                return;
            }

            // Smart Skip: Delegate logic to Session
            if (sessionRef.current && sessionRef.current.handleNext()) {
                // Session handled it (paused for score).
                // Restore Session view so user sees the ScoreBoard
                if (currentView !== 'Session') {
                    onRestoreSession();
                }
                return;
            }

            // If session didn't handle it (already showing scores or finished), play next song
            const nextItem = popNext();
            if (nextItem) {
                onSelectSong(nextItem.song, true);
            }
        } else if (remoteSong && isTVConnected) {
            sendRemoteCommand('NEXT', {});
            const nextItem = popNext();
            if (nextItem) {
                onSelectSong(nextItem.song, true);
            } else {
                setRemoteSong(null);
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
                <Box sx={{
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
                                    onSelectSong(nextItem.song, true); // forcePlay=true
                                    return;
                                }
                            }
                            onExitSession(); // Clears selectedSong in parent
                        }}
                        onMinimize={onMinimizeSession}
                        onPlaybackUpdate={setPlaybackState}
                        showDebugOverlay={false}
                        showDevSlider={false}
                        showMicStatus={false}
                        muteAudio={isTVConnected || isClient}
                        suppressResults={isTVConnected}
                        isClient={isClient}
                        isPassive={isClient}
                        passiveState={isClient ? clientGameState : undefined}
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
                                // Resume: reload and start the restored song
                                handleResume();
                            } else if (isClient && sendClientCommand) {
                                sendClientCommand('play');
                            } else if (selectedSong) {
                                sessionRef.current?.togglePlay();
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
        </>
    );
});

PlaybackManager.displayName = 'PlaybackManager';
