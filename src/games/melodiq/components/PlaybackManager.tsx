import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { type Song, type SongMeta } from '../db';
import { MelodiqSession, type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { MiniPlayer } from './MiniPlayer';
import { useQueue } from '../hooks/useQueue';

interface PlaybackManagerProps {
    selectedSong: Song | null;
    remoteSong: SongMeta | null;
    isTVConnected: boolean;
    currentView: 'Home' | 'Settings' | 'Session' | 'Connection';
    onExitSession: (forceHome?: boolean) => void;
    onMinimizeSession: () => void;
    onRestoreSession: () => void;
    onSelectSong: (song: SongMeta, forcePlay?: boolean) => void;
    sendRemoteCommand: (command: string, value: any) => void;
    setRemoteSong: (song: SongMeta | null) => void;
    onShowQueue: () => void;
    sendGameUpdate?: (state: any) => void;
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
        sendGameUpdate
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

    // Broadcast Game State Loop
    useEffect(() => {
        if (!isTVConnected || !sendGameUpdate || !playbackState.isPlaying) return;

        let frameId: number;
        const loop = () => {
            if (sessionRef.current) {
                const state = sessionRef.current.getGameState();
                sendGameUpdate(state);
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [isTVConnected, sendGameUpdate, playbackState.isPlaying]);

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
        if (selectedSong) {
            // Smart Skip: Delegate logic to Session
            if (sessionRef.current && sessionRef.current.handleNext()) {
                // Session handled it (paused for score).
                // Restore Session view so user sees the ScoreBoard (ONLY if not TV mode)
                if (currentView !== 'Session' && !isTVConnected) {
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
                        muteAudio={isTVConnected}
                        suppressResults={isTVConnected}
                    />
                </Box>
            )}

            {/* Mini Player - Local OR Remote */}
            {
                currentView === 'Home' && (
                    <MiniPlayer
                        song={selectedSong || remoteSong || null}
                        isPlaying={playbackState.isPlaying}
                        progress={playbackState.progress}
                        onTogglePlay={() => {
                            if (selectedSong) {
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
