import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { type SongMeta } from '../db';
import { usePlaylists } from '../hooks/usePlaylists';
import { YouTubeSearchDialog } from './YouTubeSearchDialog';

interface SongActionDialogsProps {
    selectedSongForQueue: SongMeta | null;
    queueDialogOpen: boolean;
    setQueueDialogOpen: (open: boolean) => void;
    
    isTVConnected: boolean;

    handleSelectSong: (song: SongMeta, forcePlay?: boolean) => void;
    addNext: (song: SongMeta) => void;
    addToQueue: (song: SongMeta) => void;
    refreshSongs: () => Promise<void>;
    
    setFeedbackMessage: (msg: string | null) => void;
    isClient?: boolean;
    clientRole?: string;
}

export const SongActionDialogs: React.FC<SongActionDialogsProps> = ({
    selectedSongForQueue, queueDialogOpen, setQueueDialogOpen,
    isTVConnected, handleSelectSong, addNext, addToQueue, refreshSongs,
    setFeedbackMessage, isClient, clientRole
}) => {
    const { t } = useTranslation();
    const { playlists, addSongToPlaylist, createPlaylist } = usePlaylists();
    
    const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
    const [youTubeSearchDialogOpen, setYouTubeSearchDialogOpen] = useState(false);
    
    // MUI Dialog state for Auto-Sync
    const [syncTimeDialogOpen, setSyncTimeDialogOpen] = useState(false);
    const [syncTimeInput, setSyncTimeInput] = useState('');

    const handleQueueOption = (action: 'play_now' | 'play_next' | 'add_end') => {
        if (!selectedSongForQueue) return;
        switch (action) {
            case 'play_now':
                handleSelectSong(selectedSongForQueue, true);
                break;
            case 'play_next':
                addNext(selectedSongForQueue);
                setFeedbackMessage(`Added to start of queue: ${selectedSongForQueue.title}`);
                break;
            case 'add_end':
                addToQueue(selectedSongForQueue);
                setFeedbackMessage(`Added to queue: ${selectedSongForQueue.title}`);
                break;
        }
        setQueueDialogOpen(false);
    };

    const handleAddToPlaylist = (playlistId: string) => {
        if (selectedSongForQueue) {
            addSongToPlaylist(playlistId, selectedSongForQueue.id);
            setFeedbackMessage(`Added to playlist`);
        }
        setPlaylistDialogOpen(false);
        setQueueDialogOpen(false);
    };

    const handleDeleteSong = async () => {
        if (!selectedSongForQueue) return;
        const confirm = window.confirm(`Wirklich "${selectedSongForQueue.title}" von ${selectedSongForQueue.artist} löschen?`);
        if (!confirm) return;
        try {
            const helperUrl = (localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000').replace(/\/$/, "");
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const res = await fetch(`${helperUrl}/api/songs/${selectedSongForQueue.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setFeedbackMessage('Song gelöscht');
                await refreshSongs();
            } else {
                setFeedbackMessage('Fehler beim Löschen');
            }
        } catch (e) {
            console.error('Failed to delete song', e);
        }
        setQueueDialogOpen(false);
    };

    const handleChangeVideoUrl = async (url: string) => {
        if (!selectedSongForQueue) return;
        setYouTubeSearchDialogOpen(false);
        setQueueDialogOpen(false);

        try {
            const helperUrl = (localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000').replace(/\/$/, "");
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const res = await fetch(`${helperUrl}/api/usdb/download`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                    usdbId: selectedSongForQueue.usdbId,
                    artist: selectedSongForQueue.artist,
                    title: selectedSongForQueue.title,
                    videoMode: 'mp4',
                    youtubeUrl: url,
                    targetDir: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.replace(/\/[^/]+$/, '') : undefined,
                    safeName: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.split('/').pop()?.replace('.txt', '') : undefined
                }])
            });
            if (res.ok) {
                setFeedbackMessage('Video-Download gestartet...');
            } else {
                setFeedbackMessage('Fehler beim Starten des Downloads');
            }
        } catch (e) {
            console.error('Failed to change video', e);
        }
    };

    const handleAutoSync = async () => {
        if (!selectedSongForQueue) return;
        setQueueDialogOpen(false);
        setSyncTimeInput('');
        setSyncTimeDialogOpen(true);
    };
    
    const confirmAutoSync = async () => {
        if (!selectedSongForQueue) return;
        setSyncTimeDialogOpen(false);
        
        let approxTime = parseFloat(syncTimeInput.replace(',', '.'));
        if (isNaN(approxTime)) approxTime = 0;

        try {
            const helperUrl = (localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000').replace(/\/$/, "");
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const res = await fetch(`${helperUrl}/api/separator/job`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                    songId: selectedSongForQueue.id,
                    songDir: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.replace(/\/[^/]+$/, '') : undefined,
                    audioFile: selectedSongForQueue.audio ? selectedSongForQueue.audio.split('/').pop()?.split('?')[0] : undefined,
                    txtFile: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.split('/').pop() : undefined,
                    safeName: selectedSongForQueue.title,
                    type: 'auto-sync',
                    approximateStartSec: approxTime
                }])
            });
            if (res.ok) {
                setFeedbackMessage('Auto-Sync (KI) Job gestartet...');
            } else {
                setFeedbackMessage('Fehler beim Starten des Auto-Syncs');
            }
        } catch (e) {
            console.error('Failed to start auto-sync', e);
        }
    };

    return (
        <>
            <Dialog open={queueDialogOpen} onClose={() => setQueueDialogOpen(false)}>
                <DialogTitle>{t('melodiq.add_end')}</DialogTitle>
                <DialogContent>
                    <List>
                        {(!isClient || clientRole === 'admin') && (
                            <ListItemButton onClick={() => handleQueueOption('play_now')}>
                                <ListItemIcon><PlayArrowIcon /></ListItemIcon>
                                <ListItemText primary={t('melodiq.play_now')} secondary={isTVConnected ? t('melodiq.play_now_tv_desc') : t('melodiq.play_now_locally_desc')} />
                            </ListItemButton>
                        )}
                        <ListItemButton onClick={() => handleQueueOption('play_next')}>
                            <ListItemIcon><PlaylistPlayIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.play_next')} secondary={t('melodiq.play_next_desc')} />
                        </ListItemButton>
                        <ListItemButton onClick={() => handleQueueOption('add_end')}>
                            <ListItemIcon><AddToQueueIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.add_end')} secondary={t('melodiq.add_end_desc')} />
                        </ListItemButton>
                        {!isClient && (
                            <ListItemButton onClick={() => setPlaylistDialogOpen(true)}>
                                <ListItemIcon><QueueMusicIcon /></ListItemIcon>
                                <ListItemText primary={t('melodiq.add_to_playlist')} secondary={t('melodiq.add_to_playlist_desc')} />
                            </ListItemButton>
                        )}
                        {(!isClient || clientRole === 'admin') && (
                            <>
                                <Divider />
                                <ListItemButton onClick={() => { setQueueDialogOpen(false); setYouTubeSearchDialogOpen(true); }}>
                                    <ListItemIcon><VideoLibraryIcon /></ListItemIcon>
                                    <ListItemText primary="Video/Audio ändern" secondary="Neues YouTube Video für diesen Song herunterladen" />
                                </ListItemButton>
                                <ListItemButton onClick={handleAutoSync}>
                                    <ListItemIcon><AutoFixHighIcon /></ListItemIcon>
                                    <ListItemText primary="Auto-Sync (KI)" secondary="Song-Start automatisch analysieren und anpassen" />
                                </ListItemButton>
                                <ListItemButton onClick={handleDeleteSong} sx={{ color: 'error.main' }}>
                                    <ListItemIcon sx={{ color: 'error.main' }}><DeleteIcon /></ListItemIcon>
                                    <ListItemText primary="Song löschen" secondary="Kompletten Song vom Server entfernen" />
                                </ListItemButton>
                            </>
                        )}
                    </List>
                </DialogContent>
            </Dialog>

            <YouTubeSearchDialog
                open={youTubeSearchDialogOpen}
                onClose={() => setYouTubeSearchDialogOpen(false)}
                initialQuery={selectedSongForQueue ? `${selectedSongForQueue.artist} ${selectedSongForQueue.title}` : ''}
                onSelectUrl={handleChangeVideoUrl}
            />

            <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)}>
                <DialogTitle>{t('melodiq.select_playlist')}</DialogTitle>
                <DialogContent>
                    {playlists.length === 0 ? (
                        <Typography sx={{ p: 2 }}>{t('melodiq.no_playlists')}</Typography>
                    ) : (
                        <List>
                            {playlists.map(p => (
                                <ListItemButton key={p.id} onClick={() => handleAddToPlaylist(p.id)}>
                                    <ListItemIcon><QueueMusicIcon /></ListItemIcon>
                                    <ListItemText primary={p.name} />
                                </ListItemButton>
                            ))}
                        </List>
                    )}
                    <Divider />
                    <List>
                        <ListItemButton onClick={async () => {
                            const name = window.prompt(t('melodiq.playlist_name'));
                            if (name && name.trim()) {
                                await createPlaylist(name.trim());
                                setFeedbackMessage(t('melodiq.playlist_created', 'Playlist created!'));
                            }
                        }}>
                            <ListItemIcon><AddIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.create_playlist')} />
                        </ListItemButton>
                    </List>
                </DialogContent>
            </Dialog>

            {/* MUI Dialog for Auto-Sync Time */}
            <Dialog open={syncTimeDialogOpen} onClose={() => setSyncTimeDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>KI Auto-Sync</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Die KI kann den Song automatisch analysieren. Wenn der Song ein langes gesprochenes Intro hat, kannst du hier die ungefähre Startzeit vorgeben (z. B. <code>25.5</code>).
                    </Typography>
                    
                    <TextField
                        fullWidth
                        label="Ungefähre Startzeit in Sekunden (optional)"
                        placeholder="z.B. 25.5"
                        value={syncTimeInput}
                        onChange={(e) => setSyncTimeInput(e.target.value)}
                        type="number"
                        inputProps={{ step: "0.1" }}
                        sx={{ mb: 2 }}
                    />
                    
                    <Alert severity="info" sx={{ mt: 1 }}>
                        <strong>Tipp:</strong> Du kannst Lieder auch einfach abspielen und beim Hören unten rechts auf das <code>...</code> Menü klicken, um den Song direkt perfekt zu synchronisieren!
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSyncTimeDialogOpen(false)} color="inherit">Abbrechen</Button>
                    <Button onClick={confirmAutoSync} variant="contained" color="primary">
                        KI Sync Starten
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
