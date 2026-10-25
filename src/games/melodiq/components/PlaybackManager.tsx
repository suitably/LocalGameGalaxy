import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Box } from '@mui/material';
import { type Song, type SongMeta } from '../db';
import { type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { PersistentSessionLayer } from './PersistentSessionLayer';
import { PlaybackFeedback } from './PlaybackFeedback';
import { useRestoredResume } from '../hooks/useRestoredResume';
import type { RestoredSong } from '../logic/savedPlayback';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { MiniPlayer } from './MiniPlayer';
import { useQueue } from '../hooks/useQueue';
import { usePlaybackReporting, IDLE_PLAYBACK_STATE } from '../hooks/usePlaybackReporting';
import { useHostPlaybackCommands } from '../hooks/useHostPlaybackCommands';
import { createMiniPlayerNextHandler } from '../hooks/miniPlayerNext';
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
  /** Song that was playing before the last page reload, restored from storage */
  restoredSong?: RestoredSong | null;
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

export const PlaybackManager = forwardRef<PlaybackManagerHandle, PlaybackManagerProps>(
  (props, ref) => {
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
      onPlayingChange,
    } = props;

    const { t } = useTranslation();
    const { queue, popNext, setNowPlaying } = useQueue();

    const sessionRef = useRef<MelodiqSessionHandle>(null);
    const { playbackState, setPlaybackState, handlePlaybackUpdate } = usePlaybackReporting(
      selectedSong,
      sendGameUpdate,
    );
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const { initialTime, handleResume, resetResume } = useRestoredResume({
      selectedSong,
      restoredSong,
      onClearRestoredSong,
      onSelectSong,
    });

    // sendClientCommand is used to control the remote session.
    const clientEngine = useClientEngine();
    const { sendClientCommand, isSessionPlaying } = isClient
      ? clientEngine
      : { sendClientCommand: undefined, isSessionPlaying: false };

    const canControlPlayback = true; // All users can control playback by default now
    const actualIsPlaying = isClient
      ? isSessionPlaying
      : Boolean(selectedSong || remoteSong) && playbackState.isPlaying;

    useEffect(() => {
      onPlayingChange?.(actualIsPlaying);
      return () => {
        onPlayingChange?.(false);
      };
    }, [actualIsPlaying, onPlayingChange]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      togglePlay: () => {
        if (selectedSong) {
          sessionRef.current?.togglePlay();
        }
      },
    }));

    // Handle MiniPlayer Next Logic
    const handleMiniPlayerNext = createMiniPlayerNextHandler({
      sessionRef,
      queue,
      popNext,
      setNowPlaying,
      selectedSong,
      remoteSong,
      isTVConnected,
      isClient,
      currentView,
      sendClientCommand,
      sendRemoteCommand,
      setRemoteSong,
      setPlaybackState,
      setFeedbackMessage,
      onSelectSong,
      onExitSession,
      onRestoreSession,
    });

    useHostPlaybackCommands(
      isClient,
      Boolean(selectedSong),
      queue.length,
      sessionRef,
      handleMiniPlayerNext,
    );

    // Determine if we are in "restored" mode (page was reloaded while a song was playing)
    const isInRestoredMode = !selectedSong && !remoteSong && !!restoredSong;

    // The song to display in the MiniPlayer
    const miniPlayerSong =
      selectedSong ||
      remoteSong ||
      (isInRestoredMode ? restoredSong : queue.length > 0 ? queue[0].song : null);

    return (
      <>
        {/* Persistent Session (Hidden or Visible) */}
        {selectedSong && (
          <PersistentSessionLayer
            key={`${selectedSong.id}-${sessionInstanceId}`}
            ref={sessionRef}
            visible={currentView === 'Session'}
            song={selectedSong}
            initialTime={initialTime}
            onExit={(forceHome = false) => {
              setNowPlaying(null);
              resetResume();
              storage.remove(STORAGE_KEYS.MELODIQ_SAVED_TIME);
              if (!forceHome) {
                const nextItem = popNext();
                if (nextItem) {
                  onSelectSong(nextItem.song, true, nextItem.participants); // forcePlay=true
                  return;
                }
              }
              setPlaybackState(IDLE_PLAYBACK_STATE);
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
        )}

        {currentView === 'Home' && (
          <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1500 }}>
            <MiniPlayer
              song={miniPlayerSong}
              isPlaying={actualIsPlaying}
              progress={isInRestoredMode ? 0 : playbackState.progress}
              onTogglePlay={() => {
                if (isInRestoredMode) {
                  handleResume(false);
                } else if (isClient && sendClientCommand) {
                  sendClientCommand(actualIsPlaying ? 'pause' : 'play');
                } else if (selectedSong) {
                  sessionRef.current?.togglePlay();
                  if (!actualIsPlaying && !isTVConnected) {
                    onRestoreSession();
                  }
                } else if (remoteSong && isTVConnected) {
                  setPlaybackState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
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
              onRestart={
                isInRestoredMode && (restoredSong?.currentTime ?? 0) > 0
                  ? () => handleResume(true)
                  : undefined
              }
              isClient={isClient}
              canControlPlayback={canControlPlayback}
            />
          </Box>
        )}

        <PlaybackFeedback message={feedbackMessage} onClose={() => setFeedbackMessage(null)} />
      </>
    );
  },
);

PlaybackManager.displayName = 'PlaybackManager';
