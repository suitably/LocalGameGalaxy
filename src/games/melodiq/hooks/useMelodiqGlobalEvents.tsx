import { useEffect, useRef } from 'react';
import { storage } from '../../../lib/storage';
import { handleHostApiRequest } from './handleHostApiRequest';
import { type Song, type SongMeta } from '../db';
import { type TVEvent } from './useTVMode';
import { useClientSessionSync } from './useClientSessionSync';
import { useRemoteConfigListener } from './useRemoteConfigListener';
import { playCalibrationBeep } from '../../../modules/audio/latency';

interface UseMelodiqGlobalEventsProps {
  lastEvent: TVEvent | null;
  popNext: () => any;
  playSongOnTV: (id: string, song: SongMeta, currentTime?: number) => Promise<void>;
  setRemoteSong: (song: SongMeta | null) => void;
  setFeedbackMessage: (msg: string | null) => void;
  handleSelectSong: (
    song: SongMeta,
    forcePlay?: boolean,
    participants?: any[],
    requester?: string,
    requesterId?: string,
  ) => void;
  manager: any;
  isTVConnected: boolean;
  sendRemoteCommand: (command: string, value?: any) => void;
  currentView: string;
  isClient: boolean;
  getSongById: (id: string) => Promise<Song | undefined>;
  setSelectedSong: (song: Song | null) => void;
  setCurrentView: (view: any) => void;
  selectedSong: Song | null;
  remoteSong: SongMeta | null;
  songs: SongMeta[];
  activeParticipants?: any[] | null;
  setActiveParticipants: (p: any[] | null) => void;
}

export const useMelodiqGlobalEvents = ({
  lastEvent,
  popNext,
  playSongOnTV,
  setRemoteSong,
  setFeedbackMessage,
  handleSelectSong,
  manager,
  isTVConnected,
  sendRemoteCommand,
  currentView,
  isClient,
  getSongById,
  setSelectedSong,
  setCurrentView,
  selectedSong,
  remoteSong,
  songs,
  activeParticipants,
  setActiveParticipants,
}: UseMelodiqGlobalEventsProps) => {
  const handleSelectSongRef = useRef(handleSelectSong);
  useEffect(() => {
    handleSelectSongRef.current = handleSelectSong;
  }, [handleSelectSong]);

  const songsRef = useRef(songs);
  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  const getSongByIdRef = useRef(getSongById);
  useEffect(() => {
    getSongByIdRef.current = getSongById;
  }, [getSongById]);

  const processedEventRef = useRef<number | null>(null);

  // 1. Handle TV Events & Auto-Play Next
  useEffect(() => {
    if (!lastEvent || lastEvent.timestamp === processedEventRef.current) return;

    if (lastEvent.type === 'PLAYBACK_STARTED') {
      processedEventRef.current = lastEvent.timestamp;
      setFeedbackMessage(`TV Playback started: ${lastEvent.payload.title}`);
    } else if (lastEvent.type === 'SONG_ENDED') {
      processedEventRef.current = lastEvent.timestamp;
      setRemoteSong(null);
      const nextItem = popNext();
      if (nextItem) {
        console.log('TV Song Ended. Playing next from queue:', nextItem.song.title);
        handleSelectSongRef.current(nextItem.song, true, nextItem.participants);
      }
    } else if (lastEvent.type === 'TV_READY') {
      processedEventRef.current = lastEvent.timestamp;
      if (selectedSong && !remoteSong) {
        console.log('TV_READY received while playing locally, switching to TV...');
        const currentTime = (window as any).__melodiq_current_time || 0;
        playSongOnTV(selectedSong.id, selectedSong, currentTime);
        setRemoteSong(selectedSong as unknown as SongMeta);
        if (currentView === 'Session') setCurrentView('Home'); // The song now plays on the TV
      }
    }
  }, [
    lastEvent,
    popNext,
    playSongOnTV,
    setRemoteSong,
    currentView,
    setCurrentView,
    setFeedbackMessage,
    selectedSong,
    remoteSong,
  ]);

  // 2. Listen for Playlist Trigger (when playPlaylistNow is called)
  useEffect(() => {
    const handlePlaylistTrigger = (e: any) => {
      const songToPlay = e.detail;
      if (songToPlay) {
        handleSelectSongRef.current(songToPlay, true);
      }
    };
    window.addEventListener('melodiq_play_playlist_trigger', handlePlaylistTrigger);
    return () => window.removeEventListener('melodiq_play_playlist_trigger', handlePlaylistTrigger);
  }, []);

  // 2.5 Listen for Remote Select Song
  useEffect(() => {
    const handleRemoteSelect = (e: any) => {
      const { songId, forcePlay, requester, requesterId } = e.detail;
      const song = songs.find((s) => s.id === songId);
      if (song) {
        handleSelectSongRef.current(song, forcePlay, undefined, requester, requesterId);
      }
    };
    window.addEventListener('melodiq_remote_select_song', handleRemoteSelect);
    return () => window.removeEventListener('melodiq_remote_select_song', handleRemoteSelect);
  }, [songs]);

  // 3. Forward Phone Commands to TV & Handle Global Commands
  useEffect(() => {
    if (!manager) return;

    const handleRemoteCommand = async (peerId: string, data: any) => {
      if (data.type === 'remote.command') {
        if (data.command === 'PING') {
          manager.sendToPeer(peerId, {
            type: 'remote.command',
            command: 'PONG',
            value: Date.now(),
          });
          return;
        }

        if (data.command === 'CALIBRATE_BEEP') {
          playCalibrationBeep();
          return;
        }

        if (isTVConnected) {
          console.log('Forwarding remote command to TV:', data.command);
          sendRemoteCommand(data.command, data.value);
        } else {
          console.log('Handling remote command locally:', data.command);
          window.dispatchEvent(
            new CustomEvent('melodiq_host_command', {
              detail: { command: data.command, value: data.value },
            }),
          );
        }
      } else if (data.type === 'api_request') {
        handleHostApiRequest({
          manager,
          peerId,
          data,
          songs: songsRef.current,
          getSongById: getSongByIdRef.current,
        });
      }
    };

    manager.on('message', handleRemoteCommand);
    return () => {
      manager.off('message', handleRemoteCommand);
    };
  }, [manager, isTVConnected, sendRemoteCommand]);

  useRemoteConfigListener(manager, currentView, setFeedbackMessage);

  useClientSessionSync({
    isClient,
    songs,
    selectedSong,
    getSongById,
    setSelectedSong,
    setCurrentView,
    setActiveParticipants,
  });

  useEffect(() => {
    if (!isClient && manager) {
      manager.broadcast({
        type: 'session_sync',
        activeSong: selectedSong
          ? { id: selectedSong.id, title: selectedSong.title, artist: selectedSong.artist }
          : null,
        participants: activeParticipants,
      });
      // Also broadcast public helper URL so clients can load images
      const helperUrl = storage.getHelperUrl();
      const helperToken = storage.getHelperToken();
      if (helperUrl) {
        manager.broadcast({
          type: 'helper_config',
          url: helperUrl,
          token: helperToken,
        });
      }
    }
  }, [isClient, selectedSong, activeParticipants, manager]);

  // 7. Auto-Play on TV Connect
  useEffect(() => {
    if (isTVConnected && selectedSong && !remoteSong) {
      console.log('TV Connected while playing locally, switching to TV...');
      const { __melodiq_current_time: currentTime } = window as Window & {
        __melodiq_current_time?: number;
      };
      playSongOnTV(selectedSong.id, selectedSong, currentTime || 0);
      setRemoteSong(selectedSong as unknown as SongMeta);
      if (currentView === 'Session') setCurrentView('Home'); // The song now plays on the TV
    } else if (!isTVConnected && remoteSong) {
      setRemoteSong(null);
    }
  }, [
    isTVConnected,
    selectedSong,
    remoteSong,
    playSongOnTV,
    setRemoteSong,
    currentView,
    setCurrentView,
  ]);
};
