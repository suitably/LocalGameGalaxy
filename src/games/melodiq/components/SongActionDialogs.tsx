import React from 'react';
import { useTranslation } from 'react-i18next';
import { type SongMeta } from '../db';
import { useSongActions } from '../hooks/useSongActions';
import { YouTubeSearchDialog } from './YouTubeSearchDialog';
import { SongActionMenu } from './SongActionMenu';
import { SongPlaylistDialogs } from './SongPlaylistDialogs';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

interface SongActionDialogsProps {
  selectedSongForQueue: SongMeta | null;
  queueDialogOpen: boolean;
  setQueueDialogOpen: (open: boolean) => void;

  isTVConnected: boolean;

  handleSelectSong: (song: SongMeta, forcePlay?: boolean) => void;
  addNext: (song: SongMeta) => void;
  addToQueue: (song: SongMeta) => void;
  refreshSongs: () => Promise<void>;

  setFeedbackMessage: (msg: string | null) => void;
  isClient?: boolean;
  clientRole?: string;
}

export const SongActionDialogs: React.FC<SongActionDialogsProps> = ({
  selectedSongForQueue: song,
  queueDialogOpen,
  setQueueDialogOpen,
  isTVConnected,
  handleSelectSong,
  addNext,
  addToQueue,
  refreshSongs,
  setFeedbackMessage,
  isClient,
  clientRole,
}) => {
  const { t } = useTranslation();
  const a = useSongActions({
    song,
    handleSelectSong,
    addNext,
    addToQueue,
    refreshSongs,
    setFeedbackMessage,
    setQueueDialogOpen,
  });

  return (
    <>
      <SongActionMenu
        open={queueDialogOpen}
        onClose={() => setQueueDialogOpen(false)}
        isClient={isClient}
        clientRole={clientRole}
        isTVConnected={isTVConnected}
        isLocalSong={song?.source === 'local'}
        hasVocals={a.hasVocals}
        isSeparating={a.isSeparating}
        isSyncing={a.isSyncing}
        canSync={a.canSync}
        separationProgress={a.activeSepJob?.progress || 0}
        onQueueOption={a.handleQueueOption}
        onAddToPlaylist={() => a.setPlaylistDialogOpen(true)}
        onChangeVideo={() => {
          setQueueDialogOpen(false);
          a.setYouTubeSearchDialogOpen(true);
        }}
        onSeparateVocals={a.handleSeparateVocalsClick}
        onFullSync={a.handleFullSync}
        onDelete={a.handleDeleteSong}
      />

      <YouTubeSearchDialog
        open={a.youTubeSearchDialogOpen}
        onClose={() => a.setYouTubeSearchDialogOpen(false)}
        initialQuery={song ? `${song.artist} ${song.title}` : ''}
        onSelectUrl={a.handleChangeVideoUrl}
      />

      <SongPlaylistDialogs
        playlists={a.playlists}
        selectOpen={a.playlistDialogOpen}
        onCloseSelect={() => a.setPlaylistDialogOpen(false)}
        onPick={a.handleAddToPlaylist}
        createOpen={a.createPlaylistDialogOpen}
        onOpenCreate={() => {
          a.setNewPlaylistName('');
          a.setCreatePlaylistDialogOpen(true);
        }}
        onCloseCreate={() => a.setCreatePlaylistDialogOpen(false)}
        name={a.newPlaylistName}
        onNameChange={a.setNewPlaylistName}
        onSubmit={a.handleCreatePlaylistSubmit}
      />

      <ConfirmDialog
        open={a.confirmDeleteOpen}
        title={t('melodiq.delete_song_title')}
        message={t('melodiq.delete_song_confirm', { title: song?.title, artist: song?.artist })}
        confirmColor="error"
        confirmText={t('melodiq.delete_btn')}
        onConfirm={a.executeDeleteSong}
        onCancel={() => a.setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        open={a.confirmReSeparateOpen}
        title={t('melodiq.re_separate_confirm_title', 'Gesangsspur erneut trennen?')}
        message={t(
          'melodiq.re_separate_confirm_desc',
          'Für diesen Song existiert bereits eine getrennte Gesangsspur. Möchtest du die Vokaltrennung wirklich erneut starten?',
        )}
        confirmText={t('melodiq.re_separate_confirm_btn', 'Erneut starten')}
        cancelText={t('common.cancel', 'Abbrechen')}
        onConfirm={a.executeSeparateVocals}
        onCancel={() => a.setConfirmReSeparateOpen(false)}
      />

      <ConfirmDialog
        open={a.fullSyncConfirmOpen}
        title={t('melodiq.full_sync_confirm_title', 'KI Full-Sync starten?')}
        message={t(
          'melodiq.full_sync_confirm_desc',
          'Der komplette Liedtext wird mithilfe von Whisper AI Wort für Wort auf die Vokal-/Audiospur synchronisiert. Dies dauert je nach Songlänge 1–3 Minuten.',
        )}
        confirmText={t('melodiq.start_sync', 'Sync starten')}
        cancelText={t('common.cancel', 'Abbrechen')}
        onConfirm={a.confirmFullSync}
        onCancel={() => a.setFullSyncConfirmOpen(false)}
      />
    </>
  );
};
