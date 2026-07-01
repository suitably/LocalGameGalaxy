import React, { useState } from 'react';
import { Box, Typography, Grid, Snackbar, Alert } from '@mui/material';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useTranslation } from 'react-i18next';
import { useQueue } from '../hooks/useQueue';
import { useSongs } from '../hooks/useSongs';
import { useDownloads } from '../hooks/useDownloads';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useSongDownloader } from '../hooks/useSongDownloader';

import { MelodiqSearchBar } from './MelodiqSearchBar';
import { QueueList } from './QueueList';
import { LocalSongsView } from './LocalSongsView';
import { OnlineSongsView } from './OnlineSongsView';
import { HistoryDrawer } from './HistoryDrawer';
import HistoryIcon from '@mui/icons-material/History';
import { IconButton, Tooltip } from '@mui/material';

export const MelodiqQueue: React.FC = () => {
    const { t } = useTranslation();
    const { queue, nowPlaying, removeFromQueue, moveItem, clearQueue, addToQueue } = useQueue();
    const { songs } = useSongs();
    const { jobs } = useDownloads();

    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const searchFilterState = useSearchFilters(songs);
    const { 
        isOnlineSearch, isSearchingOnline, 
        filteredSongs, filteredOnlineSongs 
    } = searchFilterState;

    const { handleDownloadOnly, handleDownloadAndQueue } = useSongDownloader({
        addToQueue,
        setFeedbackMessage
    });

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
                <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PlaylistPlayIcon fontSize="large" color="primary" />
                    {t('melodiq.song_queue') || 'Song Queue'}
                </Typography>
                <Tooltip title={t('melodiq.history') || 'History'}>
                    <IconButton onClick={() => setHistoryOpen(true)} color="primary" sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                        <HistoryIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Grid container spacing={4} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {/* Left Side: Current Queue */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ height: { md: '100%' }, display: 'flex', flexDirection: 'column' }}>
                    <QueueList
                        nowPlaying={nowPlaying}
                        queue={queue}
                        clearQueue={clearQueue}
                        removeFromQueue={removeFromQueue}
                        moveItem={moveItem}
                    />
                </Grid>

                {/* Right Side: Add Songs */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ height: { md: '100%' }, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ mb: 2, flexShrink: 0 }}>{t('melodiq.add_songs')}</Typography>

                    {/* Reusable Search Bar with Globe Icon Toggle */}
                    <Box sx={{ flexShrink: 0 }}>
                        <MelodiqSearchBar 
                            {...searchFilterState} 
                            filteredSongsLength={filteredSongs.length} 
                            totalSongsLength={songs.length} 
                        />
                    </Box>

                    {/* Song Lists */}
                    <Box sx={{ height: { xs: '60vh', md: 'auto' }, flexGrow: 1, overflow: 'hidden' }}>
                        {isOnlineSearch ? (
                            <OnlineSongsView 
                                isSearchingOnline={isSearchingOnline}
                                viewMode="grid"
                                filteredOnlineSongs={filteredOnlineSongs}
                                songs={songs}
                                jobs={jobs}
                                handleSelectSong={(song) => addToQueue(song, 'User')}
                                handleDownloadAndQueue={handleDownloadAndQueue}
                                handleSongLongPress={() => {}} // Not used in queue view
                                handleDownloadOnly={handleDownloadOnly}
                            />
                        ) : (
                            <LocalSongsView 
                                viewMode="grid"
                                filteredSongs={filteredSongs as any}
                                handleSelectSong={(song) => addToQueue(song, 'User')}
                                handleSongLongPress={() => {}} // Not used in queue view
                            />
                        )}
                    </Box>
                </Grid>
            </Grid>

            {/* Feedback for downloading */}
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

            <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
        </Box>
    );
};
