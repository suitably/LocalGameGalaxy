import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { melodiqFetch } from '../api/melodiqFetch';
import type { SongMeta } from '../db';
import { usePlaylists } from './usePlaylists';
import { useDownloads } from './useDownloads';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface SongActionsOptions {
  song: SongMeta | null;
  handleSelectSong: (song: SongMeta, forcePlay?: boolean) => void;
  addNext: (song: SongMeta) => void;
  addToQueue: (song: SongMeta) => void;
  refreshSongs: () => Promise<void>;
  setFeedbackMessage: (msg: string | null) => void;
  setQueueDialogOpen: (open: boolean) => void;
}

type SeparatorJobType = 'separate' | 'full-sync';

/** State and handlers behind the song action menu (queue, playlists, delete, video, AI jobs). */
export function useSongActions({
  song,
  handleSelectSong,
  addNext,
  addToQueue,
  refreshSongs,
  setFeedbackMessage,
  setQueueDialogOpen,
}: SongActionsOptions) {
  const { t } = useTranslation();
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylists();
  const { jobs } = useDownloads();

  const activeSepJob = jobs.find(
    (j) => j.songId === song?.id && (j.status === 'pending' || j.status === 'running'),
  );
  const isSeparating = activeSepJob?.type === 'separate';
  const isSyncing = activeSepJob?.type === 'full-sync';
  const hasVocals = !!(song?.vocalsAudio || song?.hasSeparation);
  const canSync = hasVocals && !isSeparating && !isSyncing;

  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [youTubeSearchDialogOpen, setYouTubeSearchDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmReSeparateOpen, setConfirmReSeparateOpen] = useState(false);
  const [fullSyncConfirmOpen, setFullSyncConfirmOpen] = useState(false);
  const [createPlaylistDialogOpen, setCreatePlaylistDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreatePlaylistSubmit = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    await createPlaylist(trimmed);
    setFeedbackMessage(t('melodiq.playlist_created', 'Playlist created!'));
    setCreatePlaylistDialogOpen(false);
    setNewPlaylistName('');
  };

  const handleQueueOption = (action: 'play_now' | 'play_next' | 'add_end') => {
    if (!song) return;
    switch (action) {
      case 'play_now':
        handleSelectSong(song, true);
        break;
      case 'play_next':
        addNext(song);
        setFeedbackMessage(t('melodiq.added_to_queue_start', { title: song.title }));
        break;
      case 'add_end':
        addToQueue(song);
        setFeedbackMessage(t('melodiq.added_to_queue', { title: song.title }));
        break;
    }
    setQueueDialogOpen(false);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    if (song) {
      addSongToPlaylist(playlistId, song.id);
      setFeedbackMessage(t('melodiq.added_to_playlist'));
    }
    setPlaylistDialogOpen(false);
    setQueueDialogOpen(false);
  };

  const executeDeleteSong = async () => {
    if (!song) return;
    try {
      const data = await melodiqFetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      if (data) {
        setFeedbackMessage(t('melodiq.song_deleted'));
        try {
          storage.remove(STORAGE_KEYS.MELODIQ_META_CACHE);
          if (window.caches) {
            await window.caches.delete('melodiq-api-cache');
          }
        } catch {
          /* ignore cache clean error */
        }
        await refreshSongs();
      } else {
        setFeedbackMessage(t('melodiq.song_delete_error'));
      }
    } catch (e) {
      console.error('Failed to delete song', e);
    }
    setConfirmDeleteOpen(false);
    setQueueDialogOpen(false);
  };

  const handleChangeVideoUrl = async (url: string, skipAudio: boolean) => {
    if (!song) return;
    setYouTubeSearchDialogOpen(false);
    setQueueDialogOpen(false);

    try {
      const data = await melodiqFetch('/api/usdb/download', {
        method: 'POST',
        body: JSON.stringify([
          {
            usdbId: song.usdbId,
            artist: song.artist,
            title: song.title,
            videoMode: 'mp4',
            youtubeUrl: url,
            targetDir: song.txtPath ? song.txtPath.replace(/\/[^/]+$/, '') : undefined,
            safeName: song.txtPath ? song.txtPath.split('/').pop()?.replace('.txt', '') : undefined,
            skipAudio,
            audioFile:
              typeof song.audio === 'string'
                ? song.audio.split('/').pop()?.split('?')[0]
                : undefined,
          },
        ]),
      });
      setFeedbackMessage(
        data ? t('melodiq.video_download_started') : t('melodiq.video_download_error'),
      );
    } catch (e) {
      console.error('Failed to change video', e);
    }
  };

  /** Starts a background separator job; reports success, a failed start or a thrown error. */
  const startSeparatorJob = async (
    type: SeparatorJobType,
    messages: { ok: string; fail: string },
  ) => {
    if (!song) return;
    try {
      const data = await melodiqFetch('/api/separator/job', {
        method: 'POST',
        body: JSON.stringify([{ songId: song.id, type }]),
      });
      setFeedbackMessage(data ? messages.ok : messages.fail);
    } catch (e: unknown) {
      console.error(`Failed to start ${type}`, e);
      setFeedbackMessage(e instanceof Error ? e.message : messages.fail);
    }
  };

  const confirmFullSync = async () => {
    if (!song) return;
    setFullSyncConfirmOpen(false);
    await startSeparatorJob('full-sync', {
      ok: t('melodiq.full_sync_started', 'KI Full-Sync (Whisper) im Hintergrund gestartet...'),
      fail: t('melodiq.sync_error'),
    });
  };

  const executeSeparateVocals = async () => {
    setConfirmReSeparateOpen(false);
    await startSeparatorJob('separate', {
      ok: t('melodiq.separate_vocals_started', 'Vokaltrennung im Hintergrund gestartet...'),
      fail: t('melodiq.separate_vocals_error', 'Fehler beim Starten der Vokaltrennung'),
    });
  };

  return {
    playlists,
    activeSepJob,
    isSeparating,
    isSyncing,
    hasVocals,
    canSync,
    playlistDialogOpen,
    setPlaylistDialogOpen,
    youTubeSearchDialogOpen,
    setYouTubeSearchDialogOpen,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    confirmReSeparateOpen,
    setConfirmReSeparateOpen,
    fullSyncConfirmOpen,
    setFullSyncConfirmOpen,
    createPlaylistDialogOpen,
    setCreatePlaylistDialogOpen,
    newPlaylistName,
    setNewPlaylistName,
    handleCreatePlaylistSubmit,
    handleQueueOption,
    handleAddToPlaylist,
    executeDeleteSong,
    handleChangeVideoUrl,
    confirmFullSync,
    executeSeparateVocals,
    handleFullSync: () => {
      if (!song) return;
      setQueueDialogOpen(false);
      setFullSyncConfirmOpen(true);
    },
    handleSeparateVocalsClick: () => {
      if (hasVocals) setConfirmReSeparateOpen(true);
      else void executeSeparateVocals();
    },
    handleDeleteSong: () => {
      if (song) setConfirmDeleteOpen(true);
    },
  };
}
