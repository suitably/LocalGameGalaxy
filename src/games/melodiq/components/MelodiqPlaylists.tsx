import React, { useState } from 'react';
import { Box, Typography, Button, Card, CardActionArea, Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch, FormControlLabel, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useTranslation } from 'react-i18next';
import { usePlaylists } from '../hooks/usePlaylists';
import { type Playlist } from '../db';

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
        updatePlaylistName
    } = usePlaylists();

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
    const [editName, setEditName] = useState('');

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
                        color={syncEnabled ? "primary" : "default"}
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
                    sx={{ borderRadius: 50, px: 3 }}
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
                                <Card sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(1.02)' }
                                }}>
                                    <CardActionArea onClick={() => onSelectPlaylist(playlist)} sx={{ flexGrow: 1, p: 2 }}>
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
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <IconButton size="small" onClick={(e) => {
                                                e.stopPropagation();
                                                setEditPlaylist(playlist);
                                                setEditName(playlist.name);
                                                setEditDialogOpen(true);
                                            }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(t('melodiq.confirm_delete_playlist'))) {
                                                    deletePlaylist(playlist.id);
                                                }
                                            }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    )}
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('melodiq.create_playlist')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('melodiq.playlist_name')}
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') handleCreate();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={handleCreate} variant="contained" disabled={!newPlaylistName.trim()}>{t('create')}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('melodiq.edit_playlist')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label={t('melodiq.playlist_name')}
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') handleEdit();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
                    <Button onClick={handleEdit} variant="contained" disabled={!editName.trim()}>{t('save')}</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};
