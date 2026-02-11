import React, { useState, useEffect } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { Box, Button, Typography, Card, Grid, TextField, InputAdornment, IconButton, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText, LinearProgress, Collapse } from '@mui/material';
import { type Song, type SongMeta } from './db';
import { MelodiqSession } from './gameplay/MelodiqSession';

import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import { MelodiqSettings } from './MelodiqSettings';


import QrCodeIcon from '@mui/icons-material/QrCode';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';

import { useTranslation } from 'react-i18next';
import { useLayout } from '../../context/LayoutContext';
import { WebRTCProvider, useWebRTC } from './audio/WebRTCContext';
import { SettingsProvider } from './hooks/SettingsContext';
import { MelodiqConnection } from './MelodiqConnection';
import { SongCard } from './components/SongCard';
import { useSongs, SongsProvider } from './hooks/useSongs';
import { useQueue } from './hooks/useQueue';
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { CastButton } from './components/CastButton';

// Navigation State
type View = 'Home' | 'Settings' | 'Session' | 'Connection';

export const MelodiqGameContent: React.FC = () => {
    const { t } = useTranslation();

    // Set the game title in the header
    // Set the game title in the header using useLayout
    // usePageTitle(t('games.melodiq.title'));

    const { setHeader, setCustomHeaderActions } = useLayout();

    // Use centralized song management hook
    const { songs, loadingProgress, refreshSongs, getSongById, isLoading } = useSongs();
    const { queue, popNext, setNowPlaying } = useQueue();

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

    // Update Global Header based on state
    // Update Global Header based on state
    // Filter Visibility State
    const [showFilters, setShowFilters] = useState(true);

    // Update Global Header based on state
    useEffect(() => {
        // Always intercept home button to keep user in Melodiq
        const homeAction = () => setCurrentView('Home');

        if (currentView === 'Home') {
            setHeader(t('games.melodiq.title'), [
                {
                    label: showFilters ? 'Hide Filters' : 'Show Filters',
                    icon: <FilterListIcon />,
                    action: () => setShowFilters(prev => !prev),
                    showAlways: true
                },
                {
                    label: `Queue (${queue.length})`,
                    icon: <PlaylistPlayIcon />,
                    action: () => window.open('/games/melodiq/queue', '_blank')
                },
                {
                    label: 'Refresh',
                    icon: <SearchIcon />,
                    action: () => refreshSongs(),
                    disabled: loadingProgress !== null
                },
                {
                    label: 'Settings',
                    icon: <SettingsIcon />,
                    action: () => setCurrentView('Settings'),
                    showAlways: true
                },
                {
                    label: 'Connect Phones',
                    icon: <QrCodeIcon />,
                    action: () => setCurrentView('Connection'),
                    showAlways: true
                }
            ], homeAction);
            setCustomHeaderActions(<CastButton />);
        } else {
            // Clear menu items for other views to avoid irrelevant actions
            setHeader(t('games.melodiq.title'), [], homeAction);
            setCustomHeaderActions(null);
        }
        return () => {
            setHeader(null, [], null);
            setCustomHeaderActions(null);
        };
    }, [currentView, queue.length, loadingProgress, refreshSongs, setCurrentView, t, setHeader, showFilters, setShowFilters, setCustomHeaderActions]);

    // Handler to select and load a song for playback
    const handleSelectSong = async (songMeta: SongMeta) => {
        try {
            const fullSong = await getSongById(songMeta.id);
            if (fullSong) {
                setSelectedSong(fullSong);
                setNowPlaying(songMeta);
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
                onExit={(forceHome = false) => {
                    setNowPlaying(null);

                    if (!forceHome) {
                        const nextItem = popNext();
                        if (nextItem) {
                            console.log("Playing next from queue:", nextItem.song.title);
                            handleSelectSong(nextItem.song);
                            return;
                        }
                    }

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
                overflow: 'hidden' // Prevent body scroll
            }}>

                {/* Header removed, now using GlobalHeader */}

                {/* Loading Progress */}
                {loadingProgress && isLoading && (
                    <Box sx={{ mb: 2, flexShrink: 0 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Loading library... {loadingProgress.total > 0 ? `${loadingProgress.loaded} / ${loadingProgress.total}` : ''}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={loadingProgress.total > 0 ? (loadingProgress.loaded / loadingProgress.total) * 100 : 0}
                        />
                    </Box>
                )}

                {/* Empty State */}
                {songs?.length === 0 && !loadingProgress && !isLoading && (
                    <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7, flexGrow: 1 }}>
                        <Typography variant="h5">Cannot connect to Melodiq Helper</Typography>
                        <Typography sx={{ mt: 1 }}>
                            To play local songs, you need the desktop helper app running.
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => alert("Binaries are in server/dist/ folder!")}
                                sx={{
                                    borderRadius: 50,
                                    px: 4,
                                    py: 1.5,
                                    backgroundImage: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                                    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                                    color: 'white'
                                }}
                            >
                                Download Helper
                            </Button>
                            <Button
                                onClick={refreshSongs}
                                variant="outlined"
                                sx={{
                                    borderRadius: 50,
                                    px: 4,
                                    py: 1.5
                                }}
                            >
                                Retry Connection
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* Filter Toggle & Container */}
                {songs.length > 0 && (
                    <Box sx={{ mb: 2, flexShrink: 0 }}>
                        <Collapse in={showFilters}>
                            <Card sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
                                    sx={{
                                        flexGrow: 1,
                                        minWidth: '200px',
                                        '& .MuiOutlinedInput-root': { borderRadius: 50 }
                                    }}
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
                                        sx={{ borderRadius: 50 }}
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
                                        sx={{ borderRadius: 50 }}
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
                                        sx={{ borderRadius: 50 }}
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
                                        sx={{ borderRadius: 50 }}
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
                                    <Button
                                        size="small"
                                        onClick={clearFilters}
                                        color="inherit"
                                        variant="outlined"
                                        sx={{ borderRadius: 50 }}
                                    >
                                        Clear All
                                    </Button>
                                )}

                                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                                    {filteredSongs.length} / {songs.length} songs
                                </Typography>
                            </Card>
                        </Collapse>
                    </Box>
                )}

                {
                    filteredSongs?.length > 0 && (
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <VirtuosoGrid
                                style={{ height: '100%', width: '100%' }}
                                totalCount={filteredSongs.length}
                                components={{
                                    List: React.forwardRef((props, ref) => <Grid container spacing={2} {...props} ref={ref as any} id="song-grid" />),
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

    // --- Remote Configuration Listener ---
    const { manager } = useWebRTC();

    useEffect(() => {
        if (!manager) return;

        // When NOT in session (Session has its own handler), listen for global commands
        // actually, PhoneQueueBridge handles queue/library commands now.
        // We just need to handle configuration here if needed, or move it to bridge too.
        // For now, keep config listener here but ensure Bridge is mounted.

        if (currentView !== 'Session') {
            const handleConfig = (peerId: string, data: any) => {
                if (data.type === 'configure' && data.config) {
                    console.log(`[Host] Received Remote Config from ${peerId}:`, data.config);
                    if (data.config.url) localStorage.setItem('melodiq_helper_url', data.config.url);
                    if (data.config.token) localStorage.setItem('melodiq_helper_token', data.config.token);
                    // Enable helper if it was disabled
                    localStorage.setItem('melodiq_enable_helper', 'true');
                    // Notify user (simple alert for now, or use Snackbar if available)
                    alert(`Configuration Updated by Remote Phone!\nURL: ${data.config.url}\nReloading...`);
                    window.location.reload();
                }
            };
            manager.on('message', handleConfig);
            return () => manager.off('message', handleConfig);
        }
    }, [manager, currentView, refreshSongs]);

    return (
        <Box sx={{ width: '100vw', height: '100%', overflow: 'hidden', bgcolor: 'background.default', color: 'text.primary' }}>
            {renderView()}
        </Box>
    );
};

export const MelodiqGame: React.FC = () => {
    return (
        <SettingsProvider>
            <WebRTCProvider>
                <SongsProvider>
                    <MelodiqGameContent />
                    <PhoneQueueBridge />
                </SongsProvider>
            </WebRTCProvider>
        </SettingsProvider>
    );
};



