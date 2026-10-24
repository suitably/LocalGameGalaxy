import React, { useState } from 'react';
import { Drawer, Box, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HistoryIcon from '@mui/icons-material/HistoryRounded';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAddRounded';
import { useTranslation } from 'react-i18next';
import { useHistory } from '../hooks/useHistory';
import { useSongs } from '../hooks/useSongs';
import { useProfiles } from '../hooks/useProfiles';
import { usePlaylists } from '../hooks/usePlaylists';
import { HistorySessionItem } from './HistorySessionItem';
import { AddToPlaylistDialog } from './AddToPlaylistDialog';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const { songs } = useSongs();
  const { profiles } = useProfiles([]);
  const { history, isLoading } = useHistory(songs, profiles);
  const { playlists, createPlaylist, addSongsToPlaylist } = usePlaylists();

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('new');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleToggleSelect = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleAddToPlaylist = async () => {
    const selectedSongIds = Array.from(selectedSessions)
      .map((id) => history.find((h) => h.id === id)?.songId)
      .filter(Boolean) as string[];

    if (selectedSongIds.length === 0) return;

    if (selectedPlaylistId === 'new') {
      if (newPlaylistName.trim()) {
        const newId = await createPlaylist(newPlaylistName.trim());
        await addSongsToPlaylist(newId, selectedSongIds);
        setSelectedSessions(new Set());
        setPlaylistDialogOpen(false);
        return;
      }
    } else {
      await addSongsToPlaylist(selectedPlaylistId, selectedSongIds);
      setSelectedSessions(new Set());
      setPlaylistDialogOpen(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 400 },
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            {t('melodiq.history') || 'History'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ overflow: 'auto', flexGrow: 1, p: 2 }}>
        {isLoading ? (
          <Typography color="text.secondary" align="center">
            {t('loading') || 'Loading...'}
          </Typography>
        ) : history.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
            <HistoryIcon sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6">{t('melodiq.no_history') || 'No History Yet'}</Typography>
          </Box>
        ) : (
          history.map((session) => (
            <HistorySessionItem
              key={session.id}
              session={session}
              selected={selectedSessions.has(session.id)}
              onToggle={() => handleToggleSelect(session.id)}
            />
          ))
        )}
      </Box>

      {/* Bottom Action Bar */}
      <Box
        sx={{
          p: 2,
          pb: 'calc(16px + 64px)',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Button
          variant="contained"
          fullWidth
          startIcon={<PlaylistAddIcon />}
          disabled={selectedSessions.size === 0}
          onClick={() => setPlaylistDialogOpen(true)}
        >
          {t('melodiq.add_selected_to_playlist') || `Add to Playlist (${selectedSessions.size})`}
        </Button>
      </Box>

      <AddToPlaylistDialog
        open={playlistDialogOpen}
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        newPlaylistName={newPlaylistName}
        onSelectPlaylist={setSelectedPlaylistId}
        onNameChange={setNewPlaylistName}
        onClose={() => setPlaylistDialogOpen(false)}
        onConfirm={handleAddToPlaylist}
      />
    </Drawer>
  );
};
