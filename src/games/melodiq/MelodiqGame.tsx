import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { initMelodiqI18n } from './i18n';
import { WebRTCProvider, WebRTCMockProvider, useWebRTC } from './audio/WebRTCContext';
import { useMelodiqSettings } from './hooks/SettingsContext';
import { useSongs, SongsProvider } from './hooks/useSongs';
import { useQueue, QueueProvider } from './hooks/useQueue';
import { useDownloads } from './hooks/useDownloads';
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { HostSettingsRpcBridge } from './components/HostSettingsRpcBridge';
import { FeedbackRpcBridge } from './components/FeedbackRpcBridge';
import { PhoneClientEngine, useClientEngine } from './PhoneClientEngine';
import { useTVMode } from './hooks/useTVMode';
import { useSearchFilters } from './hooks/useSearchFilters';
import { MelodiqHomeView } from './components/MelodiqHomeView';
import { MelodiqSubViews } from './components/MelodiqSubViews';
import { PlaybackFeedback } from './components/PlaybackFeedback';
import { useGameSettingsHost } from '../../context/GameSettingsContext';
import { useMelodiqNavigation } from './hooks/useMelodiqNavigation';
import { useMelodiqPlayback } from './hooks/useMelodiqPlayback';
import { useSongQueueDialog } from './hooks/useSongQueueDialog';
import { useGuardedDownloads } from './hooks/useGuardedDownloads';
import { useHostGameUpdate } from './hooks/useHostGameUpdate';
import { PlaybackManager } from './components/PlaybackManager';
import { HostQueueDrawer } from './components/HostQueueDrawer';
import { SongActionDialogs } from './components/SongActionDialogs';
import { useMelodiqHeader } from './hooks/useMelodiqHeader';
import { DownloadWaitScreen } from './components/DownloadWaitScreen';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initMelodiqI18n();

export const MelodiqGameContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isClient = searchParams.get('role') === 'client';

  const { songs, refreshSongs, getSongById, isLoading, hasConnectionError, localLibrary } =
    useSongs();
  const { queue, popNext, setNowPlaying, addToQueue, addNext, nowPlaying, replaceItem } =
    useQueue();
  const { jobs } = useDownloads(isClient ? 0 : 2000);

  const { manager, partyId, activeTrackerUrls } = useWebRTC();
  const {
    isTVConnected,
    isPresentationAvailable,
    openTVWindow,
    startPresentation,
    playSongOnTV,
    lastEvent,
    sendRemoteCommand,
    sendGameUpdate,
    disconnectTV,
  } = useTVMode({ partyId, activeTrackerUrls });
  const { settings } = useMelodiqSettings();
  const { clientRole, clientProfile } = useClientEngine();

  const searchFilterState = useSearchFilters(songs, jobs);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

  const { currentView, setCurrentView, handleSetCurrentView, handleCloseSubView } =
    useMelodiqNavigation();
  useGameSettingsHost({ audience: isClient ? 'client' : 'host', onClose: refreshSongs });

  const playback = useMelodiqPlayback({
    isClient,
    clientRole,
    isTVConnected,
    getSongById,
    addToQueue,
    setNowPlaying,
    playSongOnTV,
    sendRemoteCommand,
    setFeedbackMessage,
    setCurrentView,
    nowPlaying,
    popNext,
    jobs,
    queue,
    refreshSongs,
    replaceItem,
    songs,
    lastEvent,
    manager,
    currentView,
  });
  const { selectedSong, remoteSong, handleSelectSong } = playback;

  useMelodiqHeader({
    currentView,
    setCurrentView: handleSetCurrentView,
    isClient,
    isTVConnected,
    isPresentationAvailable,
    openTVWindow,
    startPresentation,
    disconnectTV,
    clientRole,
    onBackToHome: handleCloseSubView,
    onOpenLocalFolder: localLibrary.selectFolder,
  });

  const isSinger = isClient && clientRole === 'singer';
  const { selectedSongForQueue, queueDialogOpen, setQueueDialogOpen, handleSongLongPress } =
    useSongQueueDialog(isSinger, setFeedbackMessage);

  const { canDownload, handleDownloadOnly, handleDownloadAndQueue } = useGuardedDownloads(
    isClient,
    clientRole,
    { addToQueue, setFeedbackMessage },
  );

  const handleGameUpdate = useHostGameUpdate(sendGameUpdate, manager, isClient);

  if (currentView === 'DownloadWait') {
    return (
      <DownloadWaitScreen
        songTitle={selectedSong?.title || ''}
        artist={selectedSong?.artist || ''}
        onSkipAndRequeue={playback.handleSkipAndRequeue}
      />
    );
  }

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <MelodiqSubViews
        currentView={currentView}
        setCurrentView={setCurrentView}
        onCloseSubView={handleCloseSubView}
      />

      <MelodiqHomeView
        visible={currentView === 'Home' || currentView === 'Session'}
        searchFilterState={searchFilterState}
        songs={songs}
        jobs={jobs}
        isLoading={isLoading}
        hasConnectionError={hasConnectionError}
        refreshSongs={refreshSongs}
        isClient={isClient}
        isSinger={isSinger}
        canDownload={canDownload}
        viewMode={settings.defaultViewMode}
        handleSelectSong={handleSelectSong}
        handleSongLongPress={handleSongLongPress}
        handleDownloadAndQueue={handleDownloadAndQueue}
        handleDownloadOnly={handleDownloadOnly}
      />

      <PlaybackManager
        selectedSong={selectedSong}
        remoteSong={remoteSong}
        isTVConnected={isTVConnected}
        currentView={currentView}
        sessionInstanceId={playback.sessionInstanceId}
        onExitSession={playback.handleExitSession}
        onMinimizeSession={() => setCurrentView('Home')}
        onRestoreSession={() => setCurrentView('Session')}
        onSelectSong={handleSelectSong}
        sendRemoteCommand={sendRemoteCommand}
        setRemoteSong={playback.setRemoteSong}
        onShowQueue={() => setShowQueueDrawer(true)}
        sendGameUpdate={handleGameUpdate}
        restoredSong={playback.restoredSong}
        onClearRestoredSong={() => playback.setRestoredSong(null)}
        isClient={isClient}
        activeParticipants={playback.activeParticipants}
        clientDeviceId={clientProfile?.deviceId}
        onPlayingChange={playback.handlePlayingChange}
      />

      <HostQueueDrawer
        open={showQueueDrawer}
        onClose={() => setShowQueueDrawer(false)}
        activeParticipants={playback.currentDisplayParticipants}
        onToggleCurrentParticipant={playback.handleToggleCurrentParticipant}
        onReorderCurrentParticipant={playback.handleReorderCurrentParticipant}
      />

      <SongActionDialogs
        selectedSongForQueue={selectedSongForQueue}
        queueDialogOpen={queueDialogOpen}
        setQueueDialogOpen={setQueueDialogOpen}
        isTVConnected={isTVConnected}
        handleSelectSong={handleSelectSong}
        addNext={addNext}
        addToQueue={addToQueue}
        refreshSongs={refreshSongs}
        setFeedbackMessage={setFeedbackMessage}
        isClient={isClient}
        clientRole={clientRole}
      />

      <PlaybackFeedback
        message={feedbackMessage}
        onClose={() => setFeedbackMessage(null)}
        anchorVertical="top"
      />
    </Box>
  );
};

export const MelodiqGame: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isClient = searchParams.get('role') === 'client';

  return !isClient ? (
    <WebRTCProvider>
      <SongsProvider>
        <QueueProvider>
          <MelodiqGameContent />
          <PhoneQueueBridge />
          <HostSettingsRpcBridge />
          <FeedbackRpcBridge />
        </QueueProvider>
      </SongsProvider>
    </WebRTCProvider>
  ) : (
    <PhoneClientEngine>
      <WebRTCMockProvider>
        <SongsProvider>
          <QueueProvider>
            <MelodiqGameContent />
          </QueueProvider>
        </SongsProvider>
      </WebRTCMockProvider>
    </PhoneClientEngine>
  );
};
