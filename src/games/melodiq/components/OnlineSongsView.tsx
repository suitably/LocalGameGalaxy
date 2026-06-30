import React from 'react';
import { Box, CircularProgress, Grid } from '@mui/material';
import { VirtuosoGrid, Virtuoso } from 'react-virtuoso';
import { SongCard } from './SongCard';
import { SongListItem } from './SongListItem';

interface OnlineSongsViewProps {
    isSearchingOnline: boolean;
    viewMode: 'list' | 'grid';
    filteredOnlineSongs: any[];
    songs: any[];
    jobs: any[];
    handleSelectSong: (song: any) => void;
    handleDownloadAndQueue: (song: any) => void;
    handleSongLongPress: (song: any) => void;
    handleDownloadOnly: (song: any) => void;
}

export const OnlineSongsView: React.FC<OnlineSongsViewProps> = ({
    isSearchingOnline, viewMode, filteredOnlineSongs, songs, jobs,
    handleSelectSong, handleDownloadAndQueue, handleSongLongPress, handleDownloadOnly
}) => {
    if (isSearchingOnline) {
        return (
            <Box sx={{ flexGrow: 1, minHeight: 0, px: { xs: 1, sm: 2 }, pb: 2, display: 'flex', justifyContent: 'center', pt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (viewMode === 'grid') {
        return (
            <Box sx={{ flexGrow: 1, minHeight: 0, px: { xs: 1, sm: 2 }, pb: 2 }}>
                <VirtuosoGrid
                    style={{ height: '100%', width: '100%' }}
                    totalCount={filteredOnlineSongs.length}
                    components={{
                        List: React.forwardRef((props, ref) => <Grid container spacing={2} {...props} ref={ref as any} />),
                        Item: React.forwardRef((props, ref) => <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} {...props} ref={ref as any} />)
                    }}
                    itemContent={(index) => {
                        const song = filteredOnlineSongs[index];
                        const localSong = songs.find(s => s.title.toLowerCase() === song.title.toLowerCase() && s.artist.toLowerCase() === song.artist.toLowerCase());
                        const activeJob = jobs.find(j => j.usdbId === song.usdbId);
                        
                        const isDownloaded = !!localSong;
                        const isDl = !!(activeJob && activeJob.status !== 'error' && !isDownloaded);
                        const progress = activeJob ? activeJob.progress : 0;
                        return (
                            <SongCard
                                song={localSong || song}
                                isDownloading={isDl}
                                isDownloaded={isDownloaded}
                                downloadProgress={progress}
                                onClick={() => {
                                    if (isDownloaded && localSong) {
                                        handleSelectSong(localSong);
                                    } else if (!isDl && !isDownloaded) {
                                        handleDownloadAndQueue(song);
                                    }
                                }}
                                onLongPress={() => {
                                    if (isDownloaded && localSong) handleSongLongPress(localSong);
                                }}
                                onActionClick={() => {
                                    if (!isDl && !isDownloaded) handleDownloadOnly(song);
                                }}
                            />
                        );
                    }}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, minHeight: 0, px: { xs: 1, sm: 2 }, pb: 2 }}>
            <Virtuoso
                style={{ height: '100%', width: '100%' }}
                totalCount={filteredOnlineSongs.length}
                itemContent={(index) => {
                    const song = filteredOnlineSongs[index];
                    const localSong = songs.find(s => s.title.toLowerCase() === song.title.toLowerCase() && s.artist.toLowerCase() === song.artist.toLowerCase());
                    const activeJob = jobs.find(j => j.usdbId === song.usdbId);
                    
                    const isDownloaded = !!localSong;
                    const isDl = !!(activeJob && activeJob.status !== 'error' && !isDownloaded);
                    const progress = activeJob ? activeJob.progress : 0;
                    return (
                        <Box sx={{ px: 2, py: 0.5 }}>
                            <SongListItem
                                song={localSong || song}
                                isDownloading={isDl}
                                isDownloaded={isDownloaded}
                                downloadProgress={progress}
                                onClick={() => {
                                    if (isDownloaded && localSong) {
                                        handleSelectSong(localSong);
                                    } else if (!isDl && !isDownloaded) {
                                        handleDownloadAndQueue(song);
                                    }
                                }}
                                onLongPress={() => {
                                    if (isDownloaded && localSong) handleSongLongPress(localSong);
                                }}
                                onMenuClick={() => {
                                    if (isDownloaded && localSong) handleSongLongPress(localSong);
                                }}
                                onActionClick={() => {
                                    if (!isDl && !isDownloaded) handleDownloadOnly(song);
                                }}
                            />
                        </Box>
                    );
                }}
            />
        </Box>
    );
};
