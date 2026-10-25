import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { type Song } from '../db';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
}

export const IDLE_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  progress: 0,
};

/**
 * Tracks the local playback state (throttled to ~1/s), persists the playback position
 * and broadcasts the game state to the TV / remote clients.
 */
export function usePlaybackReporting(
  selectedSong: Song | null,
  sendGameUpdate?: (state: Record<string, unknown>) => void,
) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(IDLE_PLAYBACK_STATE);

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

  const lastUpdateRef = useRef<number>(0);
  const lastStorageRef = useRef<number>(0);

  const handlePlaybackUpdate = useCallback(
    (state: PlaybackState) => {
      const now = Date.now();
      (window as unknown as { __melodiq_current_time?: number }).__melodiq_current_time =
        state.currentTime;

      // Broadcast game state to TV (replaces the old separate setInterval loop)
      const song = selectedSongRef.current;
      if (sendGameUpdateRef.current && song) {
        sendGameUpdateRef.current({
          ...state,
          activeSongId: song.id,
          activeSong: { id: song.id, title: song.title, artist: song.artist },
        });
      }

      // Update isPlaying immediately (state change), but throttle progress updates to ~1/s
      setPlaybackState((prev) => {
        const isPlayingChanged = state.isPlaying !== prev.isPlaying;
        if (isPlayingChanged || now - lastUpdateRef.current > 1000) {
          lastUpdateRef.current = now;
          return state;
        }
        return prev;
      });

      if (selectedSong && state.currentTime > 0 && now - lastStorageRef.current > 1000) {
        storage.setJson(STORAGE_KEYS.MELODIQ_SAVED_TIME, {
          id: selectedSong.id,
          time: state.currentTime,
        });
        lastStorageRef.current = now;
      }
    },
    [selectedSong],
  );

  return { playbackState, setPlaybackState, handlePlaybackUpdate };
}
