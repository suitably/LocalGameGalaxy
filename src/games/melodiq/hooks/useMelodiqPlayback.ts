import { useCallback, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { type Song, type SongMeta } from '../db';
import { type QueueItem } from './useQueue';
import { useActiveParticipants } from './useActiveParticipants';
import { useDownloadSync } from './useDownloadSync';
import { useSongSelection } from './useSongSelection';
import { useMelodiqGlobalEvents } from './useMelodiqGlobalEvents';

type SelectionArgs = Parameters<typeof useSongSelection>[0];
type GlobalEventsArgs = Parameters<typeof useMelodiqGlobalEvents>[0];
type DownloadSyncArgs = Parameters<typeof useDownloadSync>[0];

interface UseMelodiqPlaybackArgs
  extends
    Pick<
      SelectionArgs,
      | 'isClient'
      | 'clientRole'
      | 'isTVConnected'
      | 'getSongById'
      | 'addToQueue'
      | 'setNowPlaying'
      | 'playSongOnTV'
      | 'sendRemoteCommand'
      | 'setFeedbackMessage'
      | 'setCurrentView'
    >,
    Pick<DownloadSyncArgs, 'jobs' | 'queue' | 'refreshSongs' | 'replaceItem'> {
  nowPlaying: SongMeta | null;
  songs: SongMeta[];
  lastEvent: GlobalEventsArgs['lastEvent'];
  manager: GlobalEventsArgs['manager'];
  currentView: string;
  popNext: () => QueueItem | null;
}

/**
 * Playback session state of the Melodiq host / client: selected (local) and remote song,
 * restored song after a reload, session participants, song selection and download-wait handling.
 */
export function useMelodiqPlayback(a: UseMelodiqPlaybackArgs) {
  const [remoteSong, setRemoteSong] = useState<SongMeta | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | SongMeta | null>(null);
  const [restoredSong, setRestoredSong] = useState<SongMeta | null>(() => a.nowPlaying ?? null);
  const [sessionInstanceId, setSessionInstanceId] = useState<number>(0);
  const participants = useActiveParticipants();
  const { setActiveParticipants } = participants;
  const { setCurrentView, setNowPlaying, playSongOnTV, isTVConnected } = a;

  const { handleSelectSong, handlePlayingChange } = useSongSelection({
    ...a,
    selectedSong,
    remoteSong,
    restoredSong,
    setRestoredSong,
    setSessionInstanceId,
    setSelectedSong,
    setRemoteSong,
    setActiveParticipants,
  });

  const handleCurrentSongDownloaded = useCallback(
    (realSong: Song) => {
      setSelectedSong(realSong);
      setNowPlaying(realSong);
      if (isTVConnected) {
        playSongOnTV(realSong.id, realSong);
        setRemoteSong(realSong);
      }
      setCurrentView('Session');
    },
    [isTVConnected, playSongOnTV, setNowPlaying, setCurrentView],
  );

  useDownloadSync({
    isClient: a.isClient,
    jobs: a.jobs,
    queue: a.queue,
    refreshSongs: a.refreshSongs,
    replaceItem: a.replaceItem,
    selectedSong,
    onCurrentSongDownloaded: handleCurrentSongDownloaded,
  });

  const { addToQueue, popNext, setFeedbackMessage } = a;
  const handleSkipAndRequeue = useCallback(() => {
    if (selectedSong && (selectedSong as SongMeta).isDownloading) {
      addToQueue(selectedSong, 'System');
      setFeedbackMessage(`${selectedSong.title} wurde hinten angestellt.`);

      const nextItem = popNext();
      if (nextItem) {
        handleSelectSong(nextItem.song, true, nextItem.participants);
      } else {
        setSelectedSong(null);
        setNowPlaying(null);
        setRemoteSong(null);
        setCurrentView('Home');
      }
    }
  }, [
    selectedSong,
    addToQueue,
    popNext,
    setNowPlaying,
    handleSelectSong,
    setCurrentView,
    setFeedbackMessage,
  ]);

  useMelodiqGlobalEvents({
    lastEvent: a.lastEvent,
    popNext,
    playSongOnTV,
    setRemoteSong,
    setFeedbackMessage,
    handleSelectSong,
    manager: a.manager,
    isTVConnected,
    sendRemoteCommand: a.sendRemoteCommand,
    currentView: a.currentView,
    isClient: a.isClient,
    getSongById: a.getSongById,
    setSelectedSong,
    setCurrentView,
    selectedSong,
    remoteSong,
    songs: a.songs,
    activeParticipants: participants.activeParticipants,
    setActiveParticipants,
  });

  const handleExitSession = () => {
    setSelectedSong(null);
    setActiveParticipants(null);
    storage.remove(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS);
    setCurrentView('Home');
  };

  // A started song supersedes the song restored after a page reload
  if ((selectedSong || remoteSong) && restoredSong !== null) {
    setRestoredSong(null);
  }

  return {
    ...participants,
    selectedSong,
    setSelectedSong,
    remoteSong,
    setRemoteSong,
    restoredSong,
    setRestoredSong,
    sessionInstanceId,
    handleSelectSong,
    handlePlayingChange,
    handleSkipAndRequeue,
    handleExitSession,
  };
}
