import React, { useMemo } from 'react';
import { Box, Typography, Button, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar, ListItemSecondaryAction } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

import { useTranslation } from 'react-i18next';
import { usePlaylists } from '../hooks/usePlaylists';
import { useSongs } from '../hooks/useSongs';
import { useQueue } from '../hooks/useQueue';
import { type Playlist, type SongMeta } from '../db';

interface PlaylistDetailsProps {
    playlist: Playlist;
    onBack: () => void;
}

export const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({ playlist, onBack }) => {
    const { t } = useTranslation();
    const { removeSongFromPlaylist, moveSongInPlaylist } = usePlaylists();
    const { songs } = useSongs();
    const { addToQueue, playPlaylistNow } = useQueue(); // Need to add playPlaylistNow to useQueue or implement here

    // Resolve song IDs to actual SongMeta objects
    const playlistSongs = useMemo(() => {
        return playlist.songs.map(id => songs.find(s => s.id === id)).filter(Boolean) as SongMeta[];
    }, [playlist.songs, songs]);

    const handlePlayNow = () => {
        if (playlistSongs.length === 0) return;
        playPlaylistNow(playlistSongs);
    };

    const handleAddToQueue = () => {
        if (playlistSongs.length === 0) return;
        playlistSongs.forEach(song => addToQueue(song));
    };

    return (
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={onBack} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5" sx={{ flexGrow: 1 }}>
                    {playlist.name}
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button 
                    variant="contained" 
                    startIcon={<PlayArrowIcon />}
                    onClick={handlePlayNow}
                    disabled={playlistSongs.length === 0}
                    sx={{ borderRadius: 50, px: 3 }}
                >
                    {t('melodiq.play_now')}
                </Button>
                <Button 
                    variant="outlined" 
                    startIcon={<PlaylistAddIcon />}
                    onClick={handleAddToQueue}
                    disabled={playlistSongs.length === 0}
                    sx={{ borderRadius: 50, px: 3 }}
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
                                sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                            >
                                <ListItemAvatar>
                                    <Avatar variant="rounded" src={typeof song.cover === 'string' ? song.cover : undefined}>
                                        <MusicNoteIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={song.title} 
                                    secondary={song.artist} 
                                    primaryTypographyProps={{ noWrap: true }}
                                    secondaryTypographyProps={{ noWrap: true }}
                                />
                                {!playlist.isGlobal && (
                                    <ListItemSecondaryAction>
                                        <IconButton 
                                            size="small" 
                                            disabled={index === 0}
                                            onClick={() => moveSongInPlaylist(playlist.id, index, index - 1)}
                                        >
                                            <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            disabled={index === playlistSongs.length - 1}
                                            onClick={() => moveSongInPlaylist(playlist.id, index, index + 1)}
                                        >
                                            <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
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
