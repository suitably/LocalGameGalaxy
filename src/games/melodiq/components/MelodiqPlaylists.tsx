import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import CloudSyncIcon from '@mui/icons-material/CloudSyncRounded';
import CloudOffIcon from '@mui/icons-material/CloudOffRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlayRounded';
import { useTranslation } from 'react-i18next';
import { usePlaylists } from '../hooks/usePlaylists';
import { type Playlist } from '../db';
import { PlaylistCard } from './PlaylistCard';
import { PlaylistNameDialog } from './PlaylistNameDialog';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

interface MelodiqPlaylistsProps {
  onBack: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export const MelodiqPlaylists: React.FC<MelodiqPlaylistsProps> = ({ onBack, onSelectPlaylist }) => {
  const { t } = useTranslation();
  const {
    playlists,
    showGlobalPlaylists,
    setShowGlobalPlaylists,
    syncEnabled,
    toggleSync,
    createPlaylist,
    deletePlaylist,
    updatePlaylistName,
  } = usePlaylists();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setCreateDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    if (editPlaylist && editName.trim()) {
      await updatePlaylistName(editPlaylist.id, editName.trim());
      setEditDialogOpen(false);
      setEditPlaylist(null);
    }
  };

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          {t('melodiq.playlists')}
        </Typography>

        <Tooltip title={syncEnabled ? t('melodiq.sync_enabled') : t('melodiq.sync_disabled')}>
          <IconButton
            onClick={() => toggleSync(!syncEnabled)}
            color={syncEnabled ? 'primary' : 'default'}
            sx={{ mr: 2 }}
          >
            {syncEnabled ? <CloudSyncIcon /> : <CloudOffIcon />}
          </IconButton>
        </Tooltip>

        <FormControlLabel
          control={
            <Switch
              checked={showGlobalPlaylists}
              onChange={(e) => setShowGlobalPlaylists(e.target.checked)}
              color="primary"
              disabled={!syncEnabled}
            />
          }
          label={t('melodiq.global_playlists')}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ borderRadius: 999, px: 3 }}
        >
          {t('melodiq.create_playlist')}
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {playlists.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
            <PlaylistPlayIcon sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">{t('melodiq.no_playlists')}</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {playlists.map((playlist) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={playlist.id}>
                <PlaylistCard
                  playlist={playlist}
                  onSelect={() => onSelectPlaylist(playlist)}
                  onEdit={() => {
                    setEditPlaylist(playlist);
                    setEditName(playlist.name);
                    setEditDialogOpen(true);
                  }}
                  onDelete={() => setPlaylistToDelete(playlist.id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <PlaylistNameDialog
        open={createDialogOpen}
        title={t('melodiq.create_playlist')}
        confirmLabel={t('create')}
        name={newPlaylistName}
        onNameChange={setNewPlaylistName}
        onClose={() => setCreateDialogOpen(false)}
        onConfirm={handleCreate}
      />

      <PlaylistNameDialog
        open={editDialogOpen}
        title={t('melodiq.edit_playlist')}
        confirmLabel={t('save')}
        name={editName}
        onNameChange={setEditName}
        onClose={() => setEditDialogOpen(false)}
        onConfirm={handleEdit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(playlistToDelete)}
        title={t('melodiq.delete_playlist', 'Playlist löschen')}
        message={t(
          'melodiq.confirm_delete_playlist',
          'Möchtest du diese Playlist wirklich löschen?',
        )}
        confirmColor="error"
        confirmText={t('common.delete', 'Löschen')}
        onConfirm={() => {
          if (playlistToDelete) {
            deletePlaylist(playlistToDelete);
            setPlaylistToDelete(null);
          }
        }}
        onCancel={() => setPlaylistToDelete(null)}
      />
    </Box>
  );
};
