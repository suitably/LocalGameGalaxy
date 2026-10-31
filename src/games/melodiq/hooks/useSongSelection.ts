import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { type Song, type SongMeta } from '../db';
import { type MelodiqParticipant } from '../types';
import { type MelodiqView } from './useMelodiqNavigation';

interface UseSongSelectionArgs {
  isClient: boolean;
  clientRole: string | null | undefined;
  isTVConnected: boolean;
  selectedSong: Song | SongMeta | null;
  remoteSong: SongMeta | null;
  restoredSong: SongMeta | null;
  getSongById: (id: string) => Promise<Song | undefined>;
  addToQueue: (song: SongMeta, requester?: string, requesterId?: string) => void;
  setNowPlaying: (song: SongMeta | null) => void;
  playSongOnTV: (id: string, song: SongMeta) => Promise<void>;
  sendRemoteCommand: (command: string, value?: unknown) => void;
  setFeedbackMessage: (msg: string | null) => void;
  setRestoredSong: (song: SongMeta | null) => void;
  setSessionInstanceId: Dispatch<SetStateAction<number>>;
  setSelectedSong: (song: Song | SongMeta | null) => void;
  setRemoteSong: (song: SongMeta | null) => void;
  setActiveParticipants: (p: MelodiqParticipant[] | null) => void;
  setCurrentView: (view: MelodiqView) => void;
}

/**
 * Song selection flow: clients forward the request to the host, the host either queues the
 * song or starts it locally / on the TV. Also tracks whether playback is currently running.
 */
export function useSongSelection(a: UseSongSelectionArgs) {
  const isPlaybackPlayingRef = useRef<boolean>(false);
  const selectedSongRef = useRef<Song | SongMeta | null>(a.selectedSong);
  const remoteSongRef = useRef<SongMeta | null>(a.remoteSong);
  // The memoized song list keeps an old selectSong, which must still see a TV that joined later
  const isTVConnectedRef = useRef(a.isTVConnected);

  useEffect(() => {
    isTVConnectedRef.current = a.isTVConnected;
  }, [a.isTVConnected]);

  useEffect(() => {
    selectedSongRef.current = a.selectedSong;
  }, [a.selectedSong]);

  useEffect(() => {
    remoteSongRef.current = a.remoteSong;
  }, [a.remoteSong]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    isPlaybackPlayingRef.current = playing;
  }, []);

  const handleSelectSong = async (
    songMeta: SongMeta,
    forcePlay: boolean = false,
    participants?: MelodiqParticipant[],
    requester?: string,
    requesterId?: string,
  ) => {
    try {
      if (a.isClient) {
        if (a.clientRole === 'singer') {
          a.setFeedbackMessage('Als Sänger kannst du keine Lieder auswählen.');
          return;
        }

        const isHostPlaying = isPlaybackPlayingRef.current;
        const canForce = a.clientRole === 'admin' || a.clientRole === 'queue_manager';
        const willForcePlay = canForce && (forcePlay || !isHostPlaying);

        window.dispatchEvent(
          new CustomEvent('melodiq_client_send_data', {
            detail: { type: 'remote.select_song', songId: songMeta.id, forcePlay: willForcePlay },
          }),
        );

        if (isHostPlaying && !willForcePlay) {
          a.setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
        } else {
          a.setFeedbackMessage(`Wird abgespielt: ${songMeta.title}`);
        }
        return;
      }

      const isPlayingActive =
        (Boolean(selectedSongRef.current) || Boolean(remoteSongRef.current)) &&
        isPlaybackPlayingRef.current;

      let actualForcePlay = forcePlay;
      if (!forcePlay && !isPlayingActive) {
        actualForcePlay = true;
      }

      if (!actualForcePlay) {
        a.addToQueue(songMeta, requester, requesterId);
        a.setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
        return;
      }

      if (a.restoredSong) {
        a.setRestoredSong(null);
      }
      const isResumingRestored = a.restoredSong?.id === songMeta.id;
      if (
        !isResumingRestored &&
        (!selectedSongRef.current || selectedSongRef.current.id !== songMeta.id)
      ) {
        storage.remove(STORAGE_KEYS.MELODIQ_SAVED_TIME);
      }

      a.setSessionInstanceId((prev) => prev + 1);
      if (participants) {
        storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, participants);
      } else {
        storage.remove(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS);
      }

      if (isTVConnectedRef.current) {
        const fullSong = await a.getSongById(songMeta.id);
        if (fullSong) {
          // Waits for a local song's files, so the session cannot start without the TV
          await a.playSongOnTV(songMeta.id, fullSong);
          a.setRemoteSong(songMeta);
          a.setSelectedSong(fullSong);
          a.setNowPlaying(songMeta);
          a.setActiveParticipants(participants || null);
        } else if (songMeta.isDownloading) {
          a.sendRemoteCommand('WAIT_FOR_DOWNLOAD', {
            title: songMeta.title,
            artist: songMeta.artist,
          });
          a.setRemoteSong(songMeta);
          a.setSelectedSong(songMeta);
          a.setNowPlaying(songMeta);
          a.setActiveParticipants(participants || null);
          a.setCurrentView('DownloadWait');
        } else {
          await a.playSongOnTV(songMeta.id, songMeta);
          a.setRemoteSong(songMeta);
        }
      } else {
        const fullSong = await a.getSongById(songMeta.id);
        if (fullSong) {
          a.setSelectedSong(fullSong);
          if (actualForcePlay) {
            a.setCurrentView('Session');
          }
          a.setNowPlaying(songMeta);
          a.setActiveParticipants(participants || null);
        } else if (songMeta.isDownloading) {
          a.setSelectedSong(songMeta);
          a.setNowPlaying(songMeta);
          a.setActiveParticipants(participants || null);
          a.setCurrentView('DownloadWait');
        } else {
          console.error('Song content not found in DB');
        }
      }
    } catch (e) {
      console.error('Failed to load song', e);
    }
  };

  return { handleSelectSong, handlePlayingChange };
}
