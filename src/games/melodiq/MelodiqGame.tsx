import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, LinearProgress, Card, CardContent, Grid, Container } from '@mui/material';
import { db, type Song } from './db';
import { MelodiqImporter, type ImportStats } from './importer';
import { MelodiqSession } from './gameplay/MelodiqSession';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

export const MelodiqGame: React.FC = () => {
    const [importing, setImporting] = useState(false);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);

    useEffect(() => {
        db.songs.toArray().then(setSongs);
    }, [importing]); // Reload when importing changes (finished)

    const handleImport = async () => {
        try {
            // @ts-ignore - File System Access API
            if (window.showDirectoryPicker) {
                // @ts-ignore
                const dirHandle = await window.showDirectoryPicker();
                setImporting(true);
                const importer = new MelodiqImporter();
                await importer.importFromHandle(dirHandle, (s) => setStats({ ...s }));
                setImporting(false);
            } else {
                // Fallback trigger
                document.getElementById('fallback-dir-input')?.click();
            }
        } catch (err) {
            console.error('Import cancelled or failed', err);
            setImporting(false);
        }
    };

    const handleFallbackImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setImporting(true);
            const importer = new MelodiqImporter();
            await importer.importFromFileList(e.target.files, (s: ImportStats) => setStats({ ...s }));
            setImporting(false);
        }
    }

    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    if (selectedSong) {
        return <MelodiqSession song={selectedSong} onExit={() => setSelectedSong(null)} />;
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <input
                type="file"
                id="fallback-dir-input"
                // @ts-ignore
                webkitdirectory=""
                directory=""
                style={{ display: 'none' }}
                onChange={handleFallbackImport}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <MusicNoteIcon fontSize="large" color="primary" />
                    Melodiq
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<FolderOpenIcon />}
                    onClick={handleImport}
                    disabled={importing}
                >
                    {importing ? 'Scanning...' : 'Load Song Directory'}
                </Button>
            </Box>

            {importing && stats && (
                <Card sx={{ mb: 4, p: 2 }}>
                    <Typography variant="h6">Importing Library...</Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Found: {stats.totalFound} | Processed: {stats.processed} | Errors: {stats.errors}
                    </Typography>
                    <LinearProgress variant="determinate" value={(stats.processed / (stats.totalFound || 1)) * 100} />
                </Card>
            )}

            <Grid container spacing={3}>
                {songs?.length === 0 && !importing && (
                    <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7 }}>
                        <Typography variant="h5">Your library is empty</Typography>
                        <Typography>Load a folder with UltraStar songs to begin</Typography>
                    </Box>
                )}

                {songs?.map((song) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={song.id}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': { transform: 'scale(1.02)' }
                            }}
                            onClick={() => setSelectedSong(song)}
                        >
                            {/* Placeholder for cover art - we only store path now, so we need logic to resolve it later, 
                                or we need to store the blob. For now just a placeholder. */}
                            <Box sx={{ height: 140, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MusicNoteIcon sx={{ fontSize: 60, opacity: 0.2 }} />
                            </Box>
                            <CardContent>
                                <Typography variant="h6" noWrap title={song.title}>{song.title}</Typography>
                                <Typography variant="subtitle1" color="text.secondary" noWrap title={song.artist}>{song.artist}</Typography>
                                <Typography variant="caption" display="block" color="text.disabled">
                                    {song.id.substring(0, 8)}...
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};
