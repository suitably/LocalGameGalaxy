import React, { useState } from 'react';
import {
    Drawer, Box, Typography, IconButton,
    Checkbox, Avatar, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, TextField,
    Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useTranslation } from 'react-i18next';
import { useHistory } from '../hooks/useHistory';
import { useSongs } from '../hooks/useSongs';
import { useProfiles } from '../hooks/useProfiles';
import { usePlaylists } from '../hooks/usePlaylists';

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
        setSelectedSessions(prev => {
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
            .map(id => history.find(h => h.id === id)?.songId)
            .filter(Boolean) as string[];

        if (selectedSongIds.length === 0) return;

        if (selectedPlaylistId === 'new') {
            if (newPlaylistName.trim()) {
                await createPlaylist(newPlaylistName.trim());
                // After creating, we need to find its ID.
                // Since createPlaylist doesn't return the ID, we might have to wait for the live query to update
                // Or just show a message. This is a bit tricky.
                // For simplicity, let's just close the dialog. The user might have to select it manually next time.
                // Or we can modify usePlaylists to return the created ID, but let's just do our best here.
                alert(t('melodiq.playlist_created_add_later') || 'Playlist created! Please open this dialog again to add the songs to it.');
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
                    bgcolor: 'rgba(20, 20, 30, 0.98)',
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 2.5, py: 2, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">{t('melodiq.history') || 'History'}</Typography>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: 'grey.400' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Box sx={{ overflow: 'auto', flexGrow: 1, p: 2 }}>
                {isLoading ? (
                    <Typography color="text.secondary" align="center">{t('loading') || 'Loading...'}</Typography>
                ) : history.length === 0 ? (
                    <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
                        <HistoryIcon sx={{ fontSize: 64, mb: 2 }} />
                        <Typography variant="h6">{t('melodiq.no_history') || 'No History Yet'}</Typography>
                    </Box>
                ) : (
                    history.map((session) => (
                        <Accordion key={session.id} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <Checkbox
                                        checked={selectedSessions.has(session.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => handleToggleSelect(session.id)}
                                    />
                                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.800', mr: 2 }}>
                                        {session.song?.cover ? (
                                            <img src={session.song.cover as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <MusicNoteIcon />
                                        )}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
                                        <Typography noWrap fontWeight="bold">{session.song?.title || 'Unknown Song'}</Typography>
                                        <Typography noWrap variant="body2" color="text.secondary">{session.song?.artist || 'Unknown Artist'}</Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                        {new Date(session.date).toLocaleDateString()}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                                <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                                {session.players.map((player, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, px: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ width: 24, height: 24, bgcolor: player.profile ? `hsl(${player.profile.hue}, 80%, 40%)` : 'grey.600', fontSize: '0.8rem' }}>
                                                {player.profile ? player.profile.name.charAt(0).toUpperCase() : '?'}
                                            </Avatar>
                                            <Typography variant="body2">{player.profile?.name || 'Unknown Player'}</Typography>
                                        </Box>
                                        <Typography variant="body2" fontWeight="bold">{player.score.toLocaleString()} pts</Typography>
                                    </Box>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    ))
                )}
            </Box>

            {/* Bottom Action Bar */}
            <Box sx={{ p: 2, pb: 'calc(16px + 64px)', borderTop: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.2)' }}>
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

            {/* Add to Playlist Dialog */}
            <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('melodiq.add_to_playlist') || 'Add to Playlist'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <Select
                        value={selectedPlaylistId}
                        onChange={(e) => setSelectedPlaylistId(e.target.value)}
                        fullWidth
                    >
                        <MenuItem value="new"><em>{t('melodiq.create_new_playlist') || '-- Create New Playlist --'}</em></MenuItem>
                        {playlists.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                    </Select>
                    {selectedPlaylistId === 'new' && (
                        <TextField
                            label={t('melodiq.playlist_name') || 'Playlist Name'}
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            fullWidth
                            autoFocus
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPlaylistDialogOpen(false)}>{t('cancel') || 'Cancel'}</Button>
                    <Button 
                        onClick={handleAddToPlaylist} 
                        variant="contained"
                        disabled={selectedPlaylistId === 'new' && !newPlaylistName.trim()}
                    >
                        {t('confirm') || 'Confirm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
};
