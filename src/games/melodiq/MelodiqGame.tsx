import React, { useState, useEffect } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Box, Button, Typography, LinearProgress, Card, CardContent, Grid, Container } from '@mui/material';
import { db, type Song } from './db';
import { MelodiqImporter, type ImportStats } from './importer';
import { MelodiqSession } from './gameplay/MelodiqSession';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SettingsIcon from '@mui/icons-material/Settings';
import { MelodiqSettings } from './MelodiqSettings';
import { formatDuration } from './utils';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../context/TitleContext';
import { WebRTCProvider } from './audio/WebRTCContext';
import { MelodiqConnection } from './MelodiqConnection';
import QrCodeIcon from '@mui/icons-material/QrCode';

// Navigation State
type View = 'Home' | 'Settings' | 'Session' | 'Connection';

export const MelodiqGame: React.FC = () => {
    const { t } = useTranslation();

    // Set the game title in the header
    usePageTitle(t('games.melodiq.title'));

    const [importing, setImporting] = useState(false);
    const [stats, setStats] = useState<ImportStats | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);

    // View State
    const [currentView, setCurrentView] = useState<View>('Home');
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    // Initial Load of Settings (For passing to session if needed, though Session reads directly now)
    // We can remove these states from here if MelodiqSession reads from localStorage directly, 
    // BUT MelodiqSession props currently require them.
    // Let's keep them read-only here or updated when returning from settings.
    // Actually, to keep it clean, let's just force a re-mount or have Session read from LS.
    // The plan says Session will read from LS. So we don't need to pass them as props anymore.
    // However, existing MelodiqSession interface expects them. We will refactor Session next.
    // For now, let's ignore passing them and rely on Session refactor.

    useEffect(() => {
        db.songs.toArray().then(setSongs);
    }, [importing]);

    const handleImport = async (forceReimport = false) => {
        try {
            // @ts-ignore
            if (window.showDirectoryPicker) {
                // @ts-ignore
                const dirHandle = await window.showDirectoryPicker();
                setImporting(true);
                const importer = new MelodiqImporter();
                await importer.importFromHandle(dirHandle, (s) => setStats({ ...s }), forceReimport);
                setImporting(false);
            } else {
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

    // Render the active view inside a single shared WebRTCProvider
    const renderView = () => {
        if (currentView === 'Session' && selectedSong) {
            return <MelodiqSession
                song={selectedSong}
                onExit={() => {
                    setSelectedSong(null);
                    setCurrentView('Home');
                }}
                showDebugOverlay={false}
                showDevSlider={false}
                showMicStatus={false}
            />;
        }

        if (currentView === 'Settings') {
            return <MelodiqSettings onBack={() => setCurrentView('Home')} />;
        }

        if (currentView === 'Connection') {
            return <MelodiqConnection onBack={() => setCurrentView('Home')} />;
        }

        // Home view
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
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            onClick={() => setCurrentView('Settings')}
                            startIcon={<SettingsIcon />}
                            variant="outlined"
                        >
                            Settings
                        </Button>
                        <Button
                            onClick={() => setCurrentView('Connection')}
                            startIcon={<QrCodeIcon />}
                            variant="outlined"
                        >
                            Connect Phones
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<FolderOpenIcon />}
                            onClick={() => handleImport(false)}
                            disabled={importing}
                        >
                            {importing ? 'Scanning...' : 'Load Song Directory'}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleImport(true)}
                            disabled={importing}
                            size="small"
                        >
                            Force Re-import
                        </Button>
                    </Box>
                </Box>

                {importing && stats && (
                    <Card sx={{ mb: 4, p: 2 }}>
                        <Typography variant="h6">Importing Library...</Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Found: {stats.totalFound} |
                            New/Updated: {stats.processed} |
                            Cached: {stats.cached} |
                            Removed: {stats.removed} |
                            Errors: {stats.errors}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={((stats.processed + stats.cached) / (stats.totalFound || 1)) * 100}
                        />
                    </Card>
                )}
                {/* Empty State */}
                {songs?.length === 0 && !importing && (
                    <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7 }}>
                        <Typography variant="h5">Your library is empty</Typography>
                        <Typography>Load a folder with UltraStar songs to begin</Typography>
                    </Box>
                )}

                {songs?.length > 0 && (
                    <VirtuosoGrid
                        style={{ height: 'calc(100vh - 200px)', width: '100%' }}
                        totalCount={songs.length}
                        components={{
                            List: React.forwardRef((props, ref) => <Grid container spacing={3} {...props} ref={ref as any} />),
                            Item: React.forwardRef((props, ref) => <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} {...props} ref={ref as any} />)
                        }}
                        itemContent={(index: number) => (
                            <SongCard
                                song={songs[index]}
                                onClick={() => {
                                    setSelectedSong(songs[index]);
                                    setCurrentView('Session');
                                }}
                            />
                        )}
                    />
                )}
            </Container>
        );
    };

    return (
        <WebRTCProvider>
            {renderView()}
        </WebRTCProvider>
    );
};



const SongCard: React.FC<{ song: Song; onClick: () => void }> = ({ song, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        if (song.cover) {
            if (song.cover instanceof Blob) {
                const url = URL.createObjectURL(song.cover);
                setCoverUrl(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof song.cover === 'string') {
                setCoverUrl(song.cover);
            }
        }
    }, [song.cover]);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' }
            }}
            onClick={onClick}
        >
            <Box sx={{ height: 140, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {coverUrl ? (
                    <img src={coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <MusicNoteIcon sx={{ fontSize: 60, opacity: 0.2 }} />
                )}
            </Box>
            <CardContent>
                <Typography variant="h6" noWrap title={song.title}>{song.title}</Typography>
                <Typography variant="subtitle1" color="text.secondary" noWrap title={song.artist}>{song.artist}</Typography>
                <Typography variant="caption" display="block" color="text.disabled">
                    {song.duration ? formatDuration(song.duration) : '0:00'} • {song.id.substring(0, 8)}...
                </Typography>
            </CardContent>
        </Card>
    );
};

