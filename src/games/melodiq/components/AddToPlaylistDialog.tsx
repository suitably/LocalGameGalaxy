import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface AddToPlaylistDialogProps {
  open: boolean;
  playlists: { id: string; name: string }[];
  selectedPlaylistId: string;
  newPlaylistName: string;
  onSelectPlaylist: (id: string) => void;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** Dialog to pick an existing playlist or create a new one. */
export const AddToPlaylistDialog: React.FC<AddToPlaylistDialogProps> = ({
  open,
  playlists,
  selectedPlaylistId,
  newPlaylistName,
  onSelectPlaylist,
  onNameChange,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('melodiq.add_to_playlist') || 'Add to Playlist'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Select
          value={selectedPlaylistId}
          onChange={(e) => onSelectPlaylist(e.target.value)}
          fullWidth
        >
          <MenuItem value="new">
            <em>{t('melodiq.create_new_playlist') || '-- Create New Playlist --'}</em>
          </MenuItem>
          {playlists.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
        {selectedPlaylistId === 'new' && (
          <TextField
            label={t('melodiq.playlist_name') || 'Playlist Name'}
            value={newPlaylistName}
            onChange={(e) => onNameChange(e.target.value)}
            fullWidth
            autoFocus
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel') || 'Cancel'}</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={selectedPlaylistId === 'new' && !newPlaylistName.trim()}
        >
          {t('confirm') || 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
