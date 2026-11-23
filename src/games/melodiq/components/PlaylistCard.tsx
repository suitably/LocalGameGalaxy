import React from 'react';
import { Box, Typography, Card, CardActionArea, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import EditIcon from '@mui/icons-material/EditRounded';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlayRounded';
import { useTranslation } from 'react-i18next';
import { type LibraryPlaylist as Playlist } from '../logic/songLibrary';

interface PlaylistCardProps {
  playlist: Playlist;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Playlist tile with open action and (for own playlists) rename/delete buttons. */
export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.02)' },
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ flexGrow: 1, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <PlaylistPlayIcon sx={{ mr: 1, color: 'primary.text' }} />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {playlist.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {playlist.songs.length} {t('melodiq.songs_count_short')}
          {!playlist.mine && playlist.ownerName
            ? ` · ${t('melodiq.library.shared_by', { name: playlist.ownerName })}`
            : playlist.shared
              ? ` · ${t('melodiq.library.shared')}`
              : ''}
        </Typography>
      </CardActionArea>

      {playlist.mine && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            p: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton
            aria-label={t('melodiq.a11y.edit')}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label={t('common.delete')}
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Card>
  );
};
