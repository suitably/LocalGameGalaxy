import React, { useState, useEffect } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Box, Button, Typography, Card, CardContent, Grid, TextField, InputAdornment, IconButton, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText, LinearProgress } from '@mui/material';
import db, { type Song, type SongMeta } from './db';
import { MelodiqSession } from './gameplay/MelodiqSession';
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
import { useSongs } from './hooks/useSongs';

// Navigation State
type View = 'Home' | 'Settings' | 'Session' | 'Connection';

export const MelodiqGame: React.FC = () => {
    const { t } = useTranslation();

    // Set the game title in the header
    usePageTitle(t('games.melodiq.title'));

    // Use centralized song management hook
    const { songs, loadingProgress, refreshSongs, getSongById } = useSongs();

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

    // Handler to select and load a song for playback
    const handleSelectSong = async (songMeta: SongMeta) => {
        try {
            const fullSong = await getSongById(songMeta.id);
            if (fullSong) {
                setSelectedSong(fullSong);
                setCurrentView('Session');
            }
        } catch (e) {
            console.error('Failed to load song:', e);
        }
    };

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
            return (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <MelodiqSettings onBack={() => {
                            // Refresh songs when returning from settings (in case import happened)
                            refreshSongs();
                            setCurrentView('Home');
                        }} />
                    </Box>
                </Box>
            );
        }

        if (currentView === 'Connection') {
            return (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <MelodiqConnection onBack={() => setCurrentView('Home')} />
                </Box>
            );
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
                    </Box>
                </Box>

                {/* Loading Progress */}
                {loadingProgress && (
                    <Box sx={{ mb: 2, flexShrink: 0 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Loading songs... {loadingProgress.loaded} / {loadingProgress.total}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(loadingProgress.loaded / loadingProgress.total) * 100}
                        />
                    </Box>
                )}

                {/* Empty State */}
                {songs?.length === 0 && !loadingProgress && (
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
                                    Item: React.forwardRef((props, ref) => {
                                        // Read density preference (default to 'small' for high density)
                                        const cardSize = localStorage.getItem('melodiq_card_size') || 'small';

                                        // Define responsive grid sizes
                                        let gridProps: any = { xs: 6, sm: 4, md: 3, lg: 2 }; // Default 'small' (dense)

                                        if (cardSize === 'medium') {
                                            gridProps = { xs: 6, sm: 4, md: 4, lg: 3 }; // 4 per row on desktop
                                        } else if (cardSize === 'large') {
                                            gridProps = { xs: 12, sm: 6, md: 4, lg: 3 }; // 4 per row but bigger on mobile
                                        } else if (cardSize === 'custom') {
                                            try {
                                                const stored = localStorage.getItem('melodiq_custom_target_columns');
                                                const target = stored ? parseInt(stored) : 6;

                                                // Calculate items per row for each breakpoint based on target (desktop/large)
                                                // Scaling factors: lg=100%, md=75%, sm=50%, xs=33% (min 1)
                                                const lgItems = Math.max(1, target);
                                                const mdItems = Math.max(1, Math.round(target * 0.75)); // e.g. 6 -> 4 or 5
                                                const smItems = Math.max(1, Math.round(target * 0.5));  // e.g. 6 -> 3
                                                const xsItems = Math.max(1, Math.round(target * 0.33)); // e.g. 6 -> 2

                                                gridProps = {
                                                    xs: 12 / xsItems,
                                                    sm: 12 / smItems,
                                                    md: 12 / mdItems,
                                                    lg: 12 / lgItems
                                                };
                                            } catch (e) {
                                                console.error('Failed to parse custom target', e);
                                            }
                                        }

                                        return <Grid size={gridProps} {...props} ref={ref as any} />;
                                    })
                                }}
                                itemContent={(index: number) => (
                                    <SongCard
                                        song={filteredSongs[index]}
                                        onClick={() => handleSelectSong(filteredSongs[index])}
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


/**
 * SongCard displays lightweight SongMeta for fast rendering.
 * Cover is loaded on-demand from the full Song table when visible.
 */
const SongCard: React.FC<{ song: SongMeta; onClick: () => void }> = ({ song, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let objectUrl: string | null = null;

        const loadCover = async () => {
            if (!song.hasCover) return;

            try {
                // Load full song to get cover handle
                const fullSong = await db.songs.get(song.id);
                if (!fullSong?.cover || !active) return;

                if (typeof fullSong.cover === 'string') {
                    setCoverUrl(fullSong.cover);
                } else if (fullSong.cover instanceof Blob) {
                    objectUrl = URL.createObjectURL(fullSong.cover);
                    if (active) setCoverUrl(objectUrl);
                } else if ('getFile' in fullSong.cover && typeof fullSong.cover.getFile === 'function') {
                    const file = await (fullSong.cover as FileSystemFileHandle).getFile();
                    if (active) {
                        objectUrl = URL.createObjectURL(file);
                        setCoverUrl(objectUrl);
                    }
                }
            } catch (e) {
                console.warn("Failed to load cover", e);
            }
        };

        loadCover();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [song.id, song.hasCover]);

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
            <Box sx={{ width: '100%', aspectRatio: '1 / 1', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
