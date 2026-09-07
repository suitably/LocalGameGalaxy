import React, { useState } from 'react';
import { melodiqFetch } from '../api/melodiqFetch';
import { Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SyncIcon from '@mui/icons-material/Sync';
import MicIcon from '@mui/icons-material/Mic';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { type SongMeta } from '../db';
import { usePlaylists } from '../hooks/usePlaylists';
import { useDownloads } from '../hooks/useDownloads';
import { YouTubeSearchDialog } from './YouTubeSearchDialog';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

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
    const { jobs } = useDownloads(queueDialogOpen ? 2000 : 0);

    const activeSepJob = jobs.find(j =>
        j.songId === selectedSongForQueue?.id &&
        (j.status === 'pending' || j.status === 'running')
    );
    const isSeparating = activeSepJob?.type === 'separate';
    const isSyncing = activeSepJob?.type === 'auto-sync' || activeSepJob?.type === 'full-sync';
    const hasVocals = !!(selectedSongForQueue?.vocalsAudio || selectedSongForQueue?.hasSeparation);
    const canSync = hasVocals && !isSeparating && !isSyncing;
    
    const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
    const [youTubeSearchDialogOpen, setYouTubeSearchDialogOpen] = useState(false);
    
    // MUI Dialog state    // Auto Sync
    const [syncTimeDialogOpen, setSyncTimeDialogOpen] = useState(false);
    const [syncTimeInput, setSyncTimeInput] = useState('');
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [confirmReSeparateOpen, setConfirmReSeparateOpen] = useState(false);
    const [fullSyncConfirmOpen, setFullSyncConfirmOpen] = useState(false);

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

    const handleDeleteSong = () => {
        if (!selectedSongForQueue) return;
        setConfirmDeleteOpen(true);
    };

    const executeDeleteSong = async () => {
        if (!selectedSongForQueue) return;
        try {
            const songId = selectedSongForQueue.id;
            const data = await melodiqFetch(`/api/songs/${songId}`, {
                method: 'DELETE'
            });
            if (data) {
                setFeedbackMessage('Song gelöscht');
                try {
                    sessionStorage.removeItem('melodiq_meta_cache');
                    if (window.caches) {
                        await window.caches.delete('melodiq-api-cache');
                    }
                } catch { /* ignore cache clean error */ }
                await refreshSongs();
            } else {
                setFeedbackMessage('Fehler beim Löschen');
            }
        } catch (e) {
            console.error('Failed to delete song', e);
        }
        setConfirmDeleteOpen(false);
        setQueueDialogOpen(false);
    };

    const handleChangeVideoUrl = async (url: string, skipAudio: boolean) => {
        if (!selectedSongForQueue) return;
        setYouTubeSearchDialogOpen(false);
        setQueueDialogOpen(false);

        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify([{
                    usdbId: selectedSongForQueue.usdbId,
                    artist: selectedSongForQueue.artist,
                    title: selectedSongForQueue.title,
                    videoMode: 'mp4',
                    youtubeUrl: url,
                    targetDir: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.replace(/\/[^/]+$/, '') : undefined,
                    safeName: selectedSongForQueue.txtPath ? selectedSongForQueue.txtPath.split('/').pop()?.replace('.txt', '') : undefined,
                    skipAudio: skipAudio,
                    audioFile: typeof selectedSongForQueue.audio === 'string' ? selectedSongForQueue.audio.split('/').pop()?.split('?')[0] : undefined
                }])
            });
            if (data) {
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
            const data = await melodiqFetch('/api/separator/job', {
                method: 'POST',
                body: JSON.stringify([{
                    songId: selectedSongForQueue.id,
                    type: 'auto-sync',
                    approximateStartSec: approxTime
                }])
            });
            if (data) {
                setFeedbackMessage('Auto-Sync (KI) Hintergrund-Job gestartet...');
            } else {
                setFeedbackMessage('Fehler beim Starten des Auto-Syncs');
            }
        } catch (e) {
            console.error('Failed to start auto-sync', e);
        }
    };

    const handleFullSync = () => {
        if (!selectedSongForQueue) return;
        setQueueDialogOpen(false);
        setFullSyncConfirmOpen(true);
    };

    const confirmFullSync = async () => {
        if (!selectedSongForQueue) return;
        setFullSyncConfirmOpen(false);

        try {
            const data = await melodiqFetch('/api/separator/job', {
                method: 'POST',
                body: JSON.stringify([{
                    songId: selectedSongForQueue.id,
                    type: 'full-sync'
                }])
            });
            if (data) {
                setFeedbackMessage(t('melodiq.full_sync_started', 'KI Full-Sync (Whisper) im Hintergrund gestartet...'));
            } else {
                setFeedbackMessage(t('melodiq.sync_error', 'Fehler beim Starten des Syncs'));
            }
        } catch (e: unknown) {
            console.error('Failed to start full-sync', e);
            setFeedbackMessage(e instanceof Error ? e.message : 'Fehler beim Starten des Full-Syncs');
        }
    };

    const handleSeparateVocalsClick = () => {
        if (hasVocals) {
            setConfirmReSeparateOpen(true);
        } else {
            executeSeparateVocals();
        }
    };

    const executeSeparateVocals = async () => {
        setConfirmReSeparateOpen(false);
        if (!selectedSongForQueue) return;
        try {
            const data = await melodiqFetch('/api/separator/job', {
                method: 'POST',
                body: JSON.stringify([{
                    songId: selectedSongForQueue.id,
                    type: 'separate'
                }])
            });
            if (data) {
                setFeedbackMessage(t('melodiq.separate_vocals_started', 'Vokaltrennung im Hintergrund gestartet...'));
            } else {
                setFeedbackMessage(t('melodiq.separate_vocals_error', 'Fehler beim Starten der Vokaltrennung'));
            }
        } catch (e: unknown) {
            console.error('Failed to start vocal separation', e);
            setFeedbackMessage(e instanceof Error ? e.message : 'Fehler beim Starten der Vokaltrennung');
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
                                <ListItemButton
                                    onClick={handleSeparateVocalsClick}
                                    disabled={isSeparating || isSyncing}
                                >
                                    <ListItemIcon><MicIcon color={hasVocals ? "action" : "primary"} /></ListItemIcon>
                                    <ListItemText
                                        primary={t('melodiq.separate_vocals_title', 'Gesangsspur trennen (UVR AI)')}
                                        secondary={
                                            isSeparating
                                                ? `${t('melodiq.vocal_separation_running', 'Vokaltrennung läuft im Hintergrund...')} (${activeSepJob?.progress || 0}%)`
                                                : hasVocals
                                                    ? t('melodiq.vocals_already_separated', 'Gesangsspur vorhanden (kann erneut ausgeführt werden)')
                                                    : t('melodiq.separate_vocals_desc', 'Audio mit KI in Gesang und Instrumental aufteilen')
                                        }
                                    />
                                </ListItemButton>
                                <ListItemButton
                                    onClick={handleAutoSync}
                                    disabled={!canSync}
                                >
                                    <ListItemIcon><AutoFixHighIcon color={canSync ? "inherit" : "disabled"} /></ListItemIcon>
                                    <ListItemText
                                        primary={t('melodiq.auto_sync_start', 'Auto-Sync (Nur Start)')}
                                        secondary={
                                            isSeparating
                                                ? t('melodiq.vocal_separation_running', 'Vokaltrennung läuft im Hintergrund...')
                                                : isSyncing
                                                    ? 'Sync-Prozess läuft bereits...'
                                                    : !hasVocals
                                                        ? t('melodiq.vocals_required_desc', 'Erfordert getrennte Gesangsspur (zuerst Gesang trennen)')
                                                        : t('melodiq.auto_sync_start_desc', 'Song-Start automatisch analysieren und anpassen')
                                        }
                                    />
                                </ListItemButton>
                                <ListItemButton
                                    onClick={handleFullSync}
                                    disabled={!canSync}
                                >
                                    <ListItemIcon><SyncIcon color={canSync ? "inherit" : "disabled"} /></ListItemIcon>
                                    <ListItemText
                                        primary={t('melodiq.full_sync_title', 'KI Full-Sync (Komplette Lyrics)')}
                                        secondary={
                                            isSeparating
                                                ? t('melodiq.vocal_separation_running', 'Vokaltrennung läuft im Hintergrund...')
                                                : isSyncing
                                                    ? 'Sync-Prozess läuft bereits...'
                                                    : !hasVocals
                                                        ? t('melodiq.vocals_required_desc', 'Erfordert getrennte Gesangsspur (zuerst Gesang trennen)')
                                                        : t('melodiq.full_sync_desc', 'Alle Wörter mit Whisper AI auf das Audio synchronisieren')
                                        }
                                    />
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
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSyncTimeDialogOpen(false)} color="inherit">Abbrechen</Button>
                    <Button onClick={confirmAutoSync} variant="contained" color="primary">
                        KI Sync Starten
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={confirmDeleteOpen}
                title="Song löschen"
                message={`Wirklich "${selectedSongForQueue?.title}" von ${selectedSongForQueue?.artist} löschen?`}
                confirmColor="error"
                confirmText="Löschen"
                onConfirm={executeDeleteSong}
                onCancel={() => setConfirmDeleteOpen(false)}
            />

            <ConfirmDialog
                open={confirmReSeparateOpen}
                title={t('melodiq.re_separate_confirm_title', 'Gesangsspur erneut trennen?')}
                message={t('melodiq.re_separate_confirm_desc', 'Für diesen Song existiert bereits eine getrennte Gesangsspur. Möchtest du die Vokaltrennung wirklich erneut starten?')}
                confirmText={t('melodiq.re_separate_confirm_btn', 'Erneut starten')}
                cancelText={t('common.cancel', 'Abbrechen')}
                onConfirm={executeSeparateVocals}
                onCancel={() => setConfirmReSeparateOpen(false)}
            />

            <ConfirmDialog
                open={fullSyncConfirmOpen}
                title={t('melodiq.full_sync_confirm_title', 'KI Full-Sync starten?')}
                message={t('melodiq.full_sync_confirm_desc', 'Der komplette Liedtext wird mithilfe von Whisper AI Wort für Wort auf die Vokal-/Audiospur synchronisiert. Dies dauert je nach Songlänge 1–3 Minuten.')}
                confirmText={t('melodiq.start_sync', 'Sync starten')}
                cancelText={t('common.cancel', 'Abbrechen')}
                onConfirm={confirmFullSync}
                onCancel={() => setFullSyncConfirmOpen(false)}
            />
        </>
    );
};
