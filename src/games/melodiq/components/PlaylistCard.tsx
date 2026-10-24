import React from 'react';
import { Box, Typography, Card, CardActionArea, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useTranslation } from 'react-i18next';
import { type Playlist } from '../db';

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
          <PlaylistPlayIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {playlist.name}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {playlist.songs.length} {t('melodiq.songs_count_short')}
        </Typography>
      </CardActionArea>

      {!playlist.isGlobal && (
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
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
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
