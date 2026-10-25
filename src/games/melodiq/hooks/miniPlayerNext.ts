import { type RefObject } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { type Song, type SongMeta } from '../db';
import { type MelodiqSessionHandle } from '../gameplay/MelodiqSession';
import { type QueueItem } from './useQueue';
import { IDLE_PLAYBACK_STATE, type PlaybackState } from './usePlaybackReporting';

interface UseMiniPlayerNextArgs {
  sessionRef: RefObject<MelodiqSessionHandle | null>;
  queue: QueueItem[];
  popNext: () => QueueItem | null;
  setNowPlaying: (song: SongMeta | null) => void;
  selectedSong: Song | null;
  remoteSong: SongMeta | null;
  isTVConnected: boolean;
  isClient: boolean;
  currentView: string;
  sendClientCommand?: (command: string) => void;
  sendRemoteCommand: (command: string, value: any) => void;
  setRemoteSong: (song: SongMeta | null) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setFeedbackMessage: (msg: string | null) => void;
  onSelectSong: (song: SongMeta, forcePlay?: boolean, participants?: any[]) => void;
  onExitSession: (forceHome?: boolean) => void;
  onRestoreSession: () => void;
}

/** Builds the MiniPlayer "next" handler: smart skip in the session, else advance the queue. */
export function createMiniPlayerNextHandler(a: UseMiniPlayerNextArgs) {
  const downloadPending = () => a.queue.length > 0 && a.queue[0].song.isDownloading;

  return () => {
    if (a.isClient && a.sendClientCommand) {
      a.sendClientCommand('next');
      return;
    }

    if (a.selectedSong) {
      // Smart Skip: Delegate logic to Session
      if (a.sessionRef.current && a.sessionRef.current.handleNext()) {
        // Session handled it (paused for score).
        // Restore Session view so user sees the ScoreBoard (or so TV displays it)
        if (a.currentView !== 'Session' && !a.isTVConnected) {
          a.onRestoreSession();
        }
        return;
      }

      // If session didn't handle it (already showing scores or finished), play next song or exit
      if (downloadPending()) {
        a.setFeedbackMessage('Waiting for download to finish...');
        return;
      }
      storage.remove(STORAGE_KEYS.MELODIQ_SAVED_TIME);
      const nextItem = a.popNext();
      if (nextItem) {
        a.onSelectSong(nextItem.song, true, nextItem.participants);
      } else {
        a.setNowPlaying(null);
        a.setPlaybackState(IDLE_PLAYBACK_STATE);
        a.onExitSession();
      }
    } else if (a.remoteSong && a.isTVConnected) {
      a.sendRemoteCommand('NEXT', {});
      if (downloadPending()) {
        a.setFeedbackMessage('Waiting for download to finish...');
        return;
      }
      const nextItem = a.popNext();
      if (nextItem) {
        a.onSelectSong(nextItem.song, true, nextItem.participants);
      } else {
        a.setRemoteSong(null);
      }
    } else {
      // Try to start from empty state
      if (downloadPending()) {
        a.setFeedbackMessage('Waiting for download to finish...');
        return;
      }
      const nextItem = a.popNext();
      if (nextItem) {
        a.onSelectSong(nextItem.song, true, nextItem.participants);
      }
    }
  };
}
