import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import AddToQueueIcon from '@mui/icons-material/AddToQueueRounded';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlayRounded';
import QueueMusicIcon from '@mui/icons-material/QueueMusicRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorderRounded';
import VideoLibraryIcon from '@mui/icons-material/VideoLibraryRounded';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import SyncIcon from '@mui/icons-material/SyncRounded';
import MicIcon from '@mui/icons-material/MicRounded';
import ZipIcon from '@mui/icons-material/FolderZipRounded';
import { useTranslation } from 'react-i18next';

interface SongActionMenuProps {
  open: boolean;
  onClose: () => void;
  isClient?: boolean;
  clientRole?: string;
  isTVConnected: boolean;
  isLocalSong: boolean;
  hasVocals: boolean;
  isSeparating: boolean;
  isSyncing: boolean;
  canSync: boolean;
  separationProgress: number;
  onQueueOption: (action: 'play_now' | 'play_next' | 'add_end') => void;
  onAddToPlaylist: () => void;
  /** Favourite toggle (#636); none hides the entry. */
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onChangeVideo: () => void;
  onSeparateVocals: () => void;
  onFullSync: () => void;
  onDelete: () => void;
  /** Link that downloads the song folder as a ZIP (#569); none hides the entry. */
  archiveUrl?: string;
}

/** The action list shown when a song is picked: queue, playlist and server-side song tools. */
export const SongActionMenu: React.FC<SongActionMenuProps> = (props) => {
  const { t } = useTranslation();
  const { isClient, clientRole, hasVocals, isSeparating, isSyncing, canSync } = props;
  const isAdmin = !isClient || clientRole === 'admin';

  const separateHint = isSeparating
    ? `${t('melodiq.vocal_separation_running')} (${props.separationProgress}%)`
    : hasVocals
      ? t('melodiq.vocals_already_separated')
      : t('melodiq.separate_vocals_desc');

  const syncHint = isSeparating
    ? t('melodiq.vocal_separation_running')
    : isSyncing
      ? t('melodiq.sync_in_progress')
      : !hasVocals
        ? t('melodiq.vocals_required_desc')
        : t('melodiq.full_sync_desc');

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>{t('melodiq.add_end')}</DialogTitle>
      <DialogContent>
        <List>
          {isAdmin && (
            <ListItemButton onClick={() => props.onQueueOption('play_now')}>
              <ListItemIcon>
                <PlayArrowIcon />
              </ListItemIcon>
              <ListItemText
                primary={t('melodiq.play_now')}
                secondary={
                  props.isTVConnected
                    ? t('melodiq.play_now_tv_desc')
                    : t('melodiq.play_now_locally_desc')
                }
              />
            </ListItemButton>
          )}
          <ListItemButton onClick={() => props.onQueueOption('play_next')}>
            <ListItemIcon>
              <PlaylistPlayIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('melodiq.play_next')}
              secondary={t('melodiq.play_next_desc')}
            />
          </ListItemButton>
          <ListItemButton onClick={() => props.onQueueOption('add_end')}>
            <ListItemIcon>
              <AddToQueueIcon />
            </ListItemIcon>
            <ListItemText primary={t('melodiq.add_end')} secondary={t('melodiq.add_end_desc')} />
          </ListItemButton>
          {props.onToggleFavorite && (
            <ListItemButton onClick={props.onToggleFavorite}>
              <ListItemIcon>
                {props.isFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
              </ListItemIcon>
              <ListItemText
                primary={t(
                  props.isFavorite
                    ? 'melodiq.library.remove_favorite'
                    : 'melodiq.library.add_favorite',
                )}
              />
            </ListItemButton>
          )}
          {!isClient && (
            <ListItemButton onClick={props.onAddToPlaylist}>
              <ListItemIcon>
                <QueueMusicIcon />
              </ListItemIcon>
              <ListItemText
                primary={t('melodiq.add_to_playlist')}
                secondary={t('melodiq.add_to_playlist_desc')}
              />
            </ListItemButton>
          )}
          {isAdmin && !props.isLocalSong && (
            <>
              <Divider />
              <ListItemButton onClick={props.onChangeVideo}>
                <ListItemIcon>
                  <VideoLibraryIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('melodiq.change_video_title')}
                  secondary={t('melodiq.change_video_desc')}
                />
              </ListItemButton>
              <ListItemButton onClick={props.onSeparateVocals} disabled={isSeparating || isSyncing}>
                <ListItemIcon>
                  <MicIcon color={hasVocals ? 'action' : 'primary'} />
                </ListItemIcon>
                <ListItemText
                  primary={t('melodiq.separate_vocals_title')}
                  secondary={separateHint}
                />
              </ListItemButton>
              <ListItemButton onClick={props.onFullSync} disabled={!canSync}>
                <ListItemIcon>
                  <SyncIcon color={canSync ? 'inherit' : 'disabled'} />
                </ListItemIcon>
                <ListItemText primary={t('melodiq.full_sync_title')} secondary={syncHint} />
              </ListItemButton>
              {props.archiveUrl && (
                <ListItemButton component="a" href={props.archiveUrl} download>
                  <ListItemIcon>
                    <ZipIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={t('melodiq.download_zip_title')}
                    secondary={t('melodiq.download_zip_desc')}
                  />
                </ListItemButton>
              )}
              <ListItemButton onClick={props.onDelete} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <DeleteIcon />
                </ListItemIcon>
                <ListItemText
                  primary={t('melodiq.delete_song_title')}
                  secondary={t('melodiq.delete_song_desc')}
                />
              </ListItemButton>
            </>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};
