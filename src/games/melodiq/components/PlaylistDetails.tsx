import React, { useMemo } from 'react';
import {
  alpha,
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  FormControlLabel,
  Switch,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAddRounded';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownwardRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';

import { useTranslation } from 'react-i18next';
import { usePlaylists } from '../hooks/usePlaylists';
import { useSongs } from '../hooks/useSongs';
import { useQueue } from '../hooks/useQueue';
import { songsByIds } from '../logic/songLibrary';

interface PlaylistDetailsProps {
  playlistId: string;
}

/** Songs of one playlist; owners reorder, remove and (on the companion) share it (#636). */
export const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({ playlistId }) => {
  const { t } = useTranslation();
  const { allPlaylists, storeKind, removeSongFromPlaylist, moveSongInPlaylist, setPlaylistShared } =
    usePlaylists();
  const { songs } = useSongs();
  const { addToQueue, playPlaylistNow } = useQueue();
  const playlist = allPlaylists.find((p) => p.id === playlistId);
  const ids = playlist?.songs;
  const playlistSongs = useMemo(() => songsByIds(songs, ids ?? []), [songs, ids]);
  if (!playlist) return null;

  const handlePlayNow = () => {
    if (playlistSongs.length === 0) return;
    playPlaylistNow(playlistSongs);
  };

  const handleAddToQueue = () => {
    if (playlistSongs.length === 0) return;
    playlistSongs.forEach((song) => addToQueue(song));
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {playlist.name}
        </Typography>
        {playlist.mine && storeKind === 'companion' && (
          <FormControlLabel
            control={
              <Switch
                checked={playlist.shared}
                onChange={(e) => void setPlaylistShared(playlist.id, e.target.checked)}
              />
            }
            label={t('melodiq.library.share_playlist')}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handlePlayNow}
          disabled={playlistSongs.length === 0}
          sx={{ borderRadius: 999, px: 3 }}
        >
          {t('melodiq.play_now')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<PlaylistAddIcon />}
          onClick={handleAddToQueue}
          disabled={playlistSongs.length === 0}
          sx={{ borderRadius: 999, px: 3 }}
        >
          {t('melodiq.add_to_queue')}
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.paper', borderRadius: 3 }}>
        {playlistSongs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
            <Typography variant="body1">{t('melodiq.playlist_empty')}</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {playlistSongs.map((song, index) => (
              <ListItem
                key={`${song.id}-${index}`}
                divider={index < playlistSongs.length - 1}
                sx={{ '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.02) } }}
              >
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    src={typeof song.cover === 'string' ? song.cover : undefined}
                  >
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={song.title}
                  secondary={song.artist}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                {playlist.mine && (
                  <ListItemSecondaryAction>
                    <IconButton
                      aria-label={t('melodiq.a11y.move_up')}
                      size="small"
                      disabled={index === 0}
                      onClick={() => moveSongInPlaylist(playlist.id, index, index - 1)}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={t('melodiq.a11y.move_down')}
                      size="small"
                      disabled={index === playlistSongs.length - 1}
                      onClick={() => moveSongInPlaylist(playlist.id, index, index + 1)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={t('melodiq.a11y.remove')}
                      size="small"
                      color="error"
                      onClick={() => removeSongFromPlaylist(playlist.id, song.id)}
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};
