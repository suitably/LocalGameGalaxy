import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar, Paper, Grid, MenuItem, Select, FormControl, InputLabel, Checkbox, Card } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useQueue } from '../hooks/useQueue';
import { useSongs } from '../hooks/useSongs';
import { SongCard } from './SongCard';
import { VirtuosoGrid } from 'react-virtuoso';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

export const MelodiqQueue: React.FC = () => {
    const { t } = useTranslation();
    const { queue, nowPlaying, removeFromQueue, moveItem, clearQueue, addToQueue } = useQueue();
    const { songs } = useSongs();
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

    // Filter songs for the "Add to Queue" section
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

    const handleMove = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            moveItem(index, index - 1);
        } else if (direction === 'down' && index < queue.length - 1) {
            moveItem(index, index + 1);
        }
    };

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <PlaylistPlayIcon fontSize="large" color="primary" />
                {t('melodiq.song_queue')}
            </Typography>

            <Grid container spacing={4} sx={{ height: { md: 'calc(100% - 60px)' } }}>
                {/* Left Side: Current Queue */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: { md: '100%' } }}>
                    {nowPlaying && (
                        <Paper sx={{ p: 2, mb: 4, bgcolor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                            <Typography variant="overline" color="success.main" fontWeight="bold">{t('melodiq.now_playing')}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                <Avatar sx={{ bgcolor: 'success.main' }}>
                                    <MusicNoteIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">{nowPlaying.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">{nowPlaying.artist}</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    )}

                    <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">{t('melodiq.up_next', { count: queue.length })}</Typography>
                        {queue.length > 0 && (
                            <Button
                                size="small"
                                color="error"
                                onClick={clearQueue}
                                startIcon={<DeleteIcon />}
                                variant="outlined"
                                sx={{ borderRadius: 50 }}
                            >
                                {t('melodiq.clear_all')}
                            </Button>
                        )}
                    </Paper>

                    <Box sx={{
                        overflow: 'auto',
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        maxHeight: { xs: '30vh', md: 'none' },
                        flexGrow: { md: 1 }
                    }}>
                        <List>
                            {queue.map((item, index) => (
                                <ListItem
                                    key={item.id}
                                    secondaryAction={
                                        <Box>
                                            <IconButton edge="end" aria-label="up" onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                                                <ArrowUpwardIcon />
                                            </IconButton>
                                            <IconButton edge="end" aria-label="down" onClick={() => handleMove(index, 'down')} disabled={index === queue.length - 1}>
                                                <ArrowDownwardIcon />
                                            </IconButton>
                                            <IconButton edge="end" aria-label="delete" onClick={() => removeFromQueue(item.id)} color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    }
                                >
                                    <ListItemAvatar>
                                        <Avatar>
                                            <MusicNoteIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={item.song.title}
                                        secondary={`${item.song.artist} ${item.requester ? `(Requested by ${item.requester})` : ''}`}
                                    />
                                </ListItem>
                            ))}
                            {queue.length === 0 && (
                                <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                                    <Typography>{t('melodiq.queue_empty')}</Typography>
                                </Box>
                            )}
                        </List>
                    </Box>
                </Grid>

                {/* Right Side: Add Songs */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column', height: { md: '100%' } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>{t('melodiq.add_songs')}</Typography>

                    <Card sx={{ mb: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
                        <TextField
                            placeholder={t('melodiq.search_add')}
                            variant="outlined"
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setSearchQuery('')}>
                                            <CloseIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                flexGrow: 1,
                                minWidth: '200px',
                                '& .MuiOutlinedInput-root': { borderRadius: 50 },
                                '& .MuiOutlinedInput-notchedOutline': { borderRadius: 50 }
                            }}
                        />

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

                        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
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

                        <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
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
                    </Card>

                    {/* On mobile: explicit height since parent isn't flex-constrained.
                         On desktop: flexGrow fills the remaining space. */}
                    <Box sx={{ height: { xs: '60vh', md: 'auto' }, flexGrow: { md: 1 }, minHeight: { md: 0 } }}>
                        <VirtuosoGrid
                            style={{ height: '100%', width: '100%' }}
                            totalCount={filteredSongs.length}
                            components={{
                                List: React.forwardRef((props, ref) => <Grid container spacing={2} {...props} ref={ref as any} />),
                                Item: React.forwardRef((props, ref) => <Grid size={{ xs: 6, sm: 4 }} {...props} ref={ref as any} />)
                            }}
                            itemContent={(index) => (
                                <SongCard
                                    song={filteredSongs[index]}
                                    onClick={() => {
                                        addToQueue(filteredSongs[index], 'User');
                                    }}
                                />
                            )}
                        />
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};
