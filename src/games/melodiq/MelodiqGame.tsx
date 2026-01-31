import React, { useState, useEffect } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Box, Button, Typography, LinearProgress, Card, CardContent, Grid, Container, TextField, InputAdornment, IconButton, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText } from '@mui/material';
import { db, type Song } from './db';
import { MelodiqImporter, type ImportStats } from './importer';
import { MelodiqSession } from './gameplay/MelodiqSession';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
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

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<{
        year: string[];
        genre: string[];
        language: string[];
        edition: string[];
    }>({
        year: [],
        genre: [],
        language: [],
        edition: []
    });

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

    const filteredSongs = React.useMemo(() => {
        let result = songs;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(song =>
                song.title.toLowerCase().includes(lowerQuery) ||
                song.artist.toLowerCase().includes(lowerQuery)
            );
        }

        if (activeFilters.year.length > 0) {
            result = result.filter(song => song.year && activeFilters.year.includes(song.year));
        }

        if (activeFilters.genre.length > 0) {
            result = result.filter(song => song.genre && activeFilters.genre.includes(song.genre));
        }

        if (activeFilters.language.length > 0) {
            result = result.filter(song => song.language && activeFilters.language.includes(song.language));
        }

        if (activeFilters.edition.length > 0) {
            result = result.filter(song => song.edition && activeFilters.edition.includes(song.edition));
        }

        return result;
    }, [songs, searchQuery, activeFilters]);

    // Derive available options
    const availableYears = React.useMemo(() =>
        Array.from(new Set(songs.map(s => s.year).filter(Boolean))).sort().reverse() as string[],
        [songs]);

    const availableGenres = React.useMemo(() =>
        Array.from(new Set(songs.map(s => s.genre).filter(Boolean))).sort() as string[],
        [songs]);

    const availableLanguages = React.useMemo(() =>
        Array.from(new Set(songs.map(s => s.language).filter(Boolean))).sort() as string[],
        [songs]);

    const availableEditions = React.useMemo(() =>
        Array.from(new Set(songs.map(s => s.edition).filter(Boolean))).sort() as string[],
        [songs]);

    const clearFilters = () => {
        setSearchQuery('');
        setActiveFilters({ year: [], genre: [], language: [], edition: [] });
    };

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
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: { xs: 2, md: 4 }, // Responsive padding
                overflow: 'hidden' // Prevent body scroll
            }}>
                <input
                    type="file"
                    id="fallback-dir-input"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    style={{ display: 'none' }}
                    onChange={handleFallbackImport}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexShrink: 0 }}>
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
                    <Card sx={{ mb: 4, p: 2, flexShrink: 0 }}>
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
                    <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7, flexGrow: 1 }}>
                        <Typography variant="h5">Your library is empty</Typography>
                        <Typography>Load a folder with UltraStar songs to begin</Typography>
                    </Box>
                )}

                {/* Search and Filters */}
                {songs.length > 0 && (
                    <Card sx={{ mb: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                        <TextField
                            placeholder="Search title, artist..."
                            variant="outlined"
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{ flexGrow: 1, minWidth: '200px' }}
                        />

                        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                            <InputLabel>Genre</InputLabel>
                            <Select
                                multiple
                                value={activeFilters.genre}
                                label="Genre"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setActiveFilters(prev => ({
                                        ...prev,
                                        genre: typeof value === 'string' ? value.split(',') : value
                                    }));
                                }}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {availableGenres.map(g => (
                                    <MenuItem key={g} value={g}>
                                        <Checkbox checked={activeFilters.genre.indexOf(g) > -1} />
                                        <ListItemText primary={g} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 100, maxWidth: 150 }}>
                            <InputLabel>Year</InputLabel>
                            <Select
                                multiple
                                value={activeFilters.year}
                                label="Year"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setActiveFilters(prev => ({
                                        ...prev,
                                        year: typeof value === 'string' ? value.split(',') : value
                                    }));
                                }}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {availableYears.map(y => (
                                    <MenuItem key={y} value={y}>
                                        <Checkbox checked={activeFilters.year.indexOf(y) > -1} />
                                        <ListItemText primary={y} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                            <InputLabel>Language</InputLabel>
                            <Select
                                multiple
                                value={activeFilters.language}
                                label="Language"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setActiveFilters(prev => ({
                                        ...prev,
                                        language: typeof value === 'string' ? value.split(',') : value
                                    }));
                                }}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {availableLanguages.map(l => (
                                    <MenuItem key={l} value={l}>
                                        <Checkbox checked={activeFilters.language.indexOf(l) > -1} />
                                        <ListItemText primary={l} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 150, maxWidth: 250 }}>
                            <InputLabel>Edition</InputLabel>
                            <Select
                                multiple
                                value={activeFilters.edition}
                                label="Edition"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setActiveFilters(prev => ({
                                        ...prev,
                                        edition: typeof value === 'string' ? value.split(',') : value
                                    }));
                                }}
                                renderValue={(selected) => selected.join(', ')}
                            >
                                {availableEditions.map(ed => (
                                    <MenuItem key={ed} value={ed}>
                                        <Checkbox checked={activeFilters.edition.indexOf(ed) > -1} />
                                        <ListItemText primary={ed} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {(searchQuery || activeFilters.year.length > 0 || activeFilters.genre.length > 0 || activeFilters.language.length > 0 || activeFilters.edition.length > 0) && (
                            <Button size="small" onClick={clearFilters} color="inherit">
                                Clear All
                            </Button>
                        )}

                        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                            {filteredSongs.length} / {songs.length} songs
                        </Typography>
                    </Card>
                )
                }

                {
                    filteredSongs?.length > 0 && (
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <VirtuosoGrid
                                style={{ height: '100%', width: '100%' }}
                                totalCount={filteredSongs.length}
                                components={{
                                    List: React.forwardRef((props, ref) => <Grid container spacing={2} {...props} ref={ref as any} />),
                                    Item: React.forwardRef((props, ref) => <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} {...props} ref={ref as any} />)
                                }}
                                itemContent={(index: number) => (
                                    <SongCard
                                        song={filteredSongs[index]}
                                        onClick={() => {
                                            setSelectedSong(filteredSongs[index]);
                                            setCurrentView('Session');
                                        }}
                                    />
                                )}
                            />
                        </Box>
                    )
                }
            </Box >
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
            <Box sx={{ height: 100, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {coverUrl ? (
                    <img src={coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <MusicNoteIcon sx={{ fontSize: 40, opacity: 0.2 }} />
                )}
            </Box>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" noWrap title={song.title} sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>{song.title}</Typography>
                <Typography variant="caption" display="block" color="text.secondary" noWrap title={song.artist} sx={{ lineHeight: 1.2 }}>{song.artist}</Typography>
                <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                    {song.duration ? formatDuration(song.duration) : '0:00'}
                </Typography>
            </CardContent>
        </Card>
    );
};
