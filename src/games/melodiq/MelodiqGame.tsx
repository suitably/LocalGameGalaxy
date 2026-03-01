import React, { useState, useEffect } from 'react';
import { VirtuosoGrid, Virtuoso } from 'react-virtuoso';
import { Box, Button, Typography, Card, Grid, TextField, InputAdornment, IconButton, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText, LinearProgress, Collapse, Dialog, DialogTitle, DialogContent, List, ListItemButton, ListItemIcon, Snackbar, Alert } from '@mui/material';
import { type Song, type SongMeta } from './db';


import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddToQueueIcon from '@mui/icons-material/AddToQueue';
import QrCodeIcon from '@mui/icons-material/QrCode';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';

import { MelodiqSettings } from './MelodiqSettings';

import { useTranslation } from 'react-i18next';
import { initMelodiqI18n } from './i18n';
import { useLayout } from '../../context/LayoutContext';
import { WebRTCProvider, useWebRTC } from './audio/WebRTCContext';
import { SettingsProvider, useMelodiqSettings } from './hooks/SettingsContext';
import { MelodiqConnection } from './MelodiqConnection';
import { SongCard } from './components/SongCard';
import { SongListItem } from './components/SongListItem';
import { useSongs, SongsProvider } from './hooks/useSongs';
import { useQueue } from './hooks/useQueue';
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { TVModeButton } from './components/TVModeButton';

import { useTVMode } from './hooks/useTVMode';
import { PlaybackManager } from './components/PlaybackManager';
import { HostQueueDrawer } from './components/HostQueueDrawer';

// Navigation State
type View = 'Home' | 'Settings' | 'Session' | 'Connection';

export const MelodiqGameContent: React.FC = () => {
    initMelodiqI18n();
    const { t } = useTranslation();

    // Set the game title in the header
    // Set the game title in the header using useLayout
    // usePageTitle(t('games.melodiq.title'));

    const { setHeader, setCustomHeaderActions } = useLayout();

    // Use centralized song management hook
    const { songs, loadingProgress, refreshSongs, getSongById, isLoading } = useSongs();
    const { queue, popNext, setNowPlaying, addToQueue, addNext } = useQueue();
    const {
        isTVConnected,
        isPresentationAvailable,
        openTVWindow,
        startPresentation,
        playSongOnTV,
        lastEvent,
        sendRemoteCommand,
        sendGameUpdate,
        disconnectTV
    } = useTVMode();
    const { manager } = useWebRTC();
    const { settings } = useMelodiqSettings();

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');

    // TV Remote State
    const [remoteSong, setRemoteSong] = useState<SongMeta | null>(null);

    // Queue Options State
    const [selectedSongForQueue, setSelectedSongForQueue] = useState<SongMeta | null>(null);
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [showQueueDrawer, setShowQueueDrawer] = useState(false);

    // Handle TV Events
    useEffect(() => {
        if (lastEvent && lastEvent.type === 'PLAYBACK_STARTED') {

            setFeedbackMessage(`TV Playback started: ${lastEvent.payload.title}`);
            // If we don't have the song set locally as remoteSong, we could try to sync it here,
            // but usually handleSelectSong sets it first.
        } else if (lastEvent && lastEvent.type === 'SONG_ENDED') {
            setRemoteSong(null);
        }
    }, [lastEvent]);



    const handleSongLongPress = (song: SongMeta) => {
        setSelectedSongForQueue(song);
        setQueueDialogOpen(true);
    };

    const handleQueueOption = (action: 'play_now' | 'play_next' | 'add_end') => {
        if (!selectedSongForQueue) return;

        switch (action) {
            case 'play_now':
                if (isTVConnected) playSongOnTV(selectedSongForQueue.id, selectedSongForQueue);
                else handleSelectSong(selectedSongForQueue);
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

    // Handle TV Events (Auto-Play Next)
    useEffect(() => {
        if (lastEvent?.type === 'SONG_ENDED') {
            const nextItem = popNext();
            if (nextItem) {
                console.log('TV Song Ended. Playing next from queue:', nextItem.song.title);
                playSongOnTV(nextItem.song.id, nextItem.song);
            }
        }
    }, [lastEvent, popNext, playSongOnTV]);

    // Forward Phone Commands to TV
    useEffect(() => {
        if (!manager || !isTVConnected) return;

        const handleRemoteCommand = (_peerId: string, data: any) => {
            // Forward commands to TV
            if (data.type === 'remote.command') {
                console.log('Forwarding remote command to TV:', data.command);
                sendRemoteCommand(data.command, data.value);
            }
        };

        manager.on('message', handleRemoteCommand);

        return () => {
            manager.off('message', handleRemoteCommand);
        };
    }, [manager, isTVConnected, sendRemoteCommand]);

    // View State
    const [currentView, setCurrentView] = useState<View>('Home');
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);

    // Update Global Header based on state
    // Filter Visibility State
    const [showFilters, setShowFilters] = useState(false);

    // View Mode State (List vs Grid)
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

    // Auto-Play on TV Connect
    useEffect(() => {
        if (isTVConnected && selectedSong && !remoteSong) {
            console.log("TV Connected while playing locally, switching to TV...");
            // Trigger play on TV
            playSongOnTV(selectedSong.id, selectedSong);
            setRemoteSong(selectedSong as unknown as SongMeta);
        }
    }, [isTVConnected, selectedSong, remoteSong, playSongOnTV]);

    // Initialize view mode from settings
    useEffect(() => {
        if (settings.defaultViewMode) {
            setViewMode(settings.defaultViewMode);
        }
    }, []); // Only on mount (or we could listen to settings changes if we want dynamic updates from settings panel)

    // Update Global Header based on state
    useEffect(() => {
        // Always intercept home button to keep user in Melodiq
        const homeAction = () => setCurrentView('Home');

        if (currentView === 'Home') {
            setHeader(t('games.melodiq.title'), [
                {
                    label: viewMode === 'grid' ? 'List View' : 'Grid View',
                    icon: viewMode === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />,
                    action: () => setViewMode(prev => prev === 'grid' ? 'list' : 'grid'),
                    showAlways: true
                },
                {
                    label: `Queue (${queue.length})`,
                    icon: <PlaylistPlayIcon />,
                    action: () => setShowQueueDrawer(true)
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
            setCustomHeaderActions(
                <TVModeButton
                    isTVConnected={isTVConnected}
                    isPresentationAvailable={isPresentationAvailable}
                    onOpenTV={openTVWindow}
                    onStartPresentation={startPresentation}
                    onDisconnect={disconnectTV}
                />
            );
        } else {
            // Clear menu items for other views to avoid irrelevant actions
            setHeader(t('games.melodiq.title'), [], homeAction);
            setCustomHeaderActions(null);
        }
        return () => {
            setHeader(null, [], null);
            setCustomHeaderActions(null);
        };
    }, [currentView, queue.length, loadingProgress, refreshSongs, setCurrentView, t, setHeader, showFilters, setShowFilters, setCustomHeaderActions, isTVConnected, openTVWindow, isPresentationAvailable, startPresentation, disconnectTV, viewMode]);

    // Handler to select and load a song for playback
    const handleSelectSong = async (songMeta: SongMeta, forcePlay: boolean = false) => {
        try {
            // Check for default click action if something is already playing
            // logic: if (playing && action != play_now) -> do action
            // "playing" means either local playback (selectedSong is active) or TV playback (remoteSong)
            const isPlaying = !!selectedSong || (isTVConnected && !!remoteSong);

            // User Request: If something is playing, clicking a song should ALWAYS add to queue (end)
            if (!forcePlay && isPlaying) {
                addToQueue(songMeta);
                setFeedbackMessage(`Added to queue: ${songMeta.title}`);
                return;
            }


            if (isTVConnected) {
                // Send media URLs to TV for audio/video playback
                const fullSong = await getSongById(songMeta.id);
                playSongOnTV(songMeta.id, fullSong || songMeta);
                setRemoteSong(songMeta);

                // Also start local session for pitch visualization & scoring
                if (fullSong) {
                    setSelectedSong(fullSong);
                    setNowPlaying(songMeta);
                    // setCurrentView('Session'); // User requested: don't open session view on Host by default if TV connected
                }
            } else {
                // Standard local playback
                const fullSong = await getSongById(songMeta.id);
                if (fullSong) {
                    setSelectedSong(fullSong);
                    setNowPlaying(songMeta); // Update queue context
                    setCurrentView('Session');
                } else {
                    console.error("Song content not found in DB");
                }
            }
        } catch (e) {
            console.error("Failed to load song", e);
        }
    };


    const handleMinimizeSession = () => {
        setCurrentView('Home');
    };

    const handleRestoreSession = () => {
        setCurrentView('Session');
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
        // setSearchQuery(''); // Keep search query when clearing filters
        setActiveFilters({ year: [], genre: [], language: [], edition: [] });
    };

    // Render the active view inside a single shared WebRTCProvider
    const renderView = () => {
        // We render MelodiqSession if selectedSong is present, but hide it if not in Session view
        // NOTE: activeSong logic is now split: selectedSong (Local) vs remoteSong (TV)

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
                overflow: 'hidden', // Prevent body scroll

                pb: (selectedSong || remoteSong) ? '64px' : 0 // Add padding for MiniPlayer
            }}>

                {/* Header removed, now using GlobalHeader */}

                {/* Loading Progress */}
                {
                    loadingProgress && isLoading && (
                        <Box sx={{ mb: 2, flexShrink: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {loadingProgress.total > 0 ? t('melodiq.loading_library', { loaded: loadingProgress.loaded, total: loadingProgress.total }) : t('melodiq.scanning')}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={loadingProgress.total > 0 ? (loadingProgress.loaded / loadingProgress.total) * 100 : 0}
                            />
                        </Box>
                    )
                }

                {/* Empty State */}
                {
                    songs?.length === 0 && !loadingProgress && !isLoading && (
                        <Box sx={{ width: '100%', textAlign: 'center', py: 8, opacity: 0.7, flexGrow: 1 }}>
                            <Typography variant="h5">{t('melodiq.cannot_connect')}</Typography>
                            <Typography sx={{ mt: 1 }}>
                                {t('melodiq.helper_required')}
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
                                    {t('melodiq.download_helper')}
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
                                    {t('melodiq.retry_connection')}
                                </Button>
                            </Box>
                        </Box>
                    )
                }

                {/* Search & Filter Container */}
                {
                    songs.length > 0 && (
                        <Box sx={{ flexShrink: 0 }}>
                            <Box sx={{
                                bgcolor: 'background.paper',
                                pl: { xs: 2, sm: 3 },
                                pr: { xs: 1, sm: 1.5 },
                                py: 1,
                                mb: showFilters ? 0 : 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}>
                                <TextField
                                    placeholder={t('melodiq.search_placeholder')}
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
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 50,
                                            bgcolor: 'rgba(255,255,255,0.08)',
                                            height: 40,
                                        }
                                    }}
                                />
                                <IconButton
                                    onClick={() => setShowFilters(prev => !prev)}
                                    color={showFilters ? 'primary' : 'inherit'}
                                    size="large"
                                    sx={{
                                        flexShrink: 0,
                                    }}
                                >
                                    <FilterListIcon />
                                </IconButton>
                            </Box>

                            <Collapse in={showFilters}>
                                <Card sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>

                                    <FormControl size="small" sx={{ minWidth: 120, maxWidth: 200 }}>
                                        <InputLabel>{t('melodiq.genre')}</InputLabel>
                                        <Select
                                            multiple
                                            value={activeFilters.genre}
                                            label={t('melodiq.genre')}
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
                                        <InputLabel>{t('melodiq.year')}</InputLabel>
                                        <Select
                                            multiple
                                            value={activeFilters.year}
                                            label={t('melodiq.year')}
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
                                        <InputLabel>{t('melodiq.language')}</InputLabel>
                                        <Select
                                            multiple
                                            value={activeFilters.language}
                                            label={t('melodiq.language')}
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
                                        <InputLabel>{t('melodiq.edition')}</InputLabel>
                                        <Select
                                            multiple
                                            value={activeFilters.edition}
                                            label={t('melodiq.edition')}
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

                                    {(activeFilters.year.length > 0 || activeFilters.genre.length > 0 || activeFilters.language.length > 0 || activeFilters.edition.length > 0) && (
                                        <Button
                                            size="small"
                                            onClick={clearFilters}
                                            color="inherit"
                                            variant="outlined"
                                            sx={{ borderRadius: 50 }}
                                        >
                                            {t('melodiq.clear_filters')}
                                        </Button>
                                    )}

                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                                        {t('melodiq.songs_count', { filtered: filteredSongs.length, total: songs.length })}
                                    </Typography>
                                </Card>
                            </Collapse>
                        </Box>
                    )
                }

                {
                    filteredSongs?.length > 0 && (
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            {viewMode === 'grid' ? (
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
                                    itemContent={(index) => {
                                        const song = filteredSongs[index];
                                        return (
                                            <SongCard
                                                song={song}
                                                onClick={() => handleSelectSong(song)}
                                                onLongPress={() => handleSongLongPress(song)}
                                            />
                                        );
                                    }}
                                />
                            ) : (
                                <Virtuoso
                                    style={{ height: '100%', width: '100%' }}
                                    totalCount={filteredSongs.length}
                                    itemContent={(index) => {
                                        const song = filteredSongs[index];
                                        return (
                                            <Box sx={{ px: 2, py: 0.5 }}>
                                                <SongListItem
                                                    song={song}
                                                    onClick={() => handleSelectSong(song)}
                                                    onLongPress={() => handleSongLongPress(song)}
                                                    onMenuClick={() => handleSongLongPress(song)}
                                                />
                                            </Box>
                                        );
                                    }}
                                />
                            )}
                        </Box>
                    )
                }

            </Box >
        );
    };

    // --- Remote Configuration Listener ---
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

            {/* Persistent Session & MiniPlayer (Managed by PlaybackManager) */}
            <PlaybackManager
                selectedSong={selectedSong}
                remoteSong={remoteSong}
                isTVConnected={isTVConnected}
                currentView={currentView}
                onExitSession={(forceHome = false) => {
                    if (forceHome) {
                        setCurrentView('Home');
                        setSelectedSong(null);
                    } else {
                        setSelectedSong(null);
                        setCurrentView('Home');
                    }
                }}
                onMinimizeSession={handleMinimizeSession}
                onRestoreSession={handleRestoreSession}
                onSelectSong={handleSelectSong}
                sendRemoteCommand={sendRemoteCommand}
                setRemoteSong={setRemoteSong}
                onShowQueue={() => setShowQueueDrawer(true)}
                sendGameUpdate={sendGameUpdate}
            />

            {/* Host Queue Drawer */}
            <HostQueueDrawer
                open={showQueueDrawer}
                onClose={() => setShowQueueDrawer(false)}
            />

            {/* Queue Options Dialog */}
            <Dialog open={queueDialogOpen} onClose={() => setQueueDialogOpen(false)}>
                <DialogTitle>{t('melodiq.add_end')}</DialogTitle>
                <DialogContent>
                    <List>
                        <ListItemButton onClick={() => { handleQueueOption('play_now'); setQueueDialogOpen(false); }}>
                            <ListItemIcon><PlayArrowIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.play_now')} secondary={isTVConnected ? t('melodiq.play_now_tv_desc') : t('melodiq.play_now_locally_desc')} />
                        </ListItemButton>
                        <ListItemButton onClick={() => { handleQueueOption('play_next'); setQueueDialogOpen(false); }}>
                            <ListItemIcon><PlaylistPlayIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.play_next')} secondary={t('melodiq.play_next_desc')} />
                        </ListItemButton>
                        <ListItemButton onClick={() => { handleQueueOption('add_end'); setQueueDialogOpen(false); }}>
                            <ListItemIcon><AddToQueueIcon /></ListItemIcon>
                            <ListItemText primary={t('melodiq.add_end')} secondary={t('melodiq.add_end_desc')} />
                        </ListItemButton>
                    </List>
                </DialogContent>
            </Dialog>

            {/* Playback Feedback */}
            <Snackbar
                open={!!feedbackMessage}
                autoHideDuration={3000}
                onClose={() => setFeedbackMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="info" onClose={() => setFeedbackMessage(null)}>
                    {feedbackMessage}
                </Alert>
            </Snackbar>
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



