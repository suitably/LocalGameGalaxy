import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import QueueMusicIcon from '@mui/icons-material/QueueMusicRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import { useTranslation } from 'react-i18next';

interface PlaylistRef {
  id: string;
  name: string;
}

interface SongPlaylistDialogsProps {
  playlists: PlaylistRef[];
  selectOpen: boolean;
  onCloseSelect: () => void;
  onPick: (playlistId: string) => void;
  createOpen: boolean;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  name: string;
  onNameChange: (name: string) => void;
  onSubmit: () => Promise<void>;
}

/** "Add to playlist" picker and the nested "create playlist" dialog. */
export const SongPlaylistDialogs: React.FC<SongPlaylistDialogsProps> = ({
  playlists,
  selectOpen,
  onCloseSelect,
  onPick,
  createOpen,
  onOpenCreate,
  onCloseCreate,
  name,
  onNameChange,
  onSubmit,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <Dialog open={selectOpen} onClose={onCloseSelect}>
        <DialogTitle>{t('melodiq.select_playlist')}</DialogTitle>
        <DialogContent>
          {playlists.length === 0 ? (
            <Typography sx={{ p: 2 }}>{t('melodiq.no_playlists')}</Typography>
          ) : (
            <List>
              {playlists.map((p) => (
                <ListItemButton key={p.id} onClick={() => onPick(p.id)}>
                  <ListItemIcon>
                    <QueueMusicIcon />
                  </ListItemIcon>
                  <ListItemText primary={p.name} />
                </ListItemButton>
              ))}
            </List>
          )}
          <Divider />
          <List>
            <ListItemButton onClick={onOpenCreate}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary={t('melodiq.create_playlist')} />
            </ListItemButton>
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onClose={onCloseCreate} maxWidth="xs" fullWidth>
        <DialogTitle>{t('melodiq.create_playlist', 'Create Playlist')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={t('melodiq.playlist_name', 'Playlist Name')}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                await onSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onCloseCreate} color="inherit">
            {t('common.cancel', 'Abbrechen')}
          </Button>
          <Button
            onClick={onSubmit}
            variant="contained"
            color="primary"
            disabled={!name.trim()}
            sx={{ fontWeight: 700 }}
          >
            {t('common.save', 'Speichern')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
