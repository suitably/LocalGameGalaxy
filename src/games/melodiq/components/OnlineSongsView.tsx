import React from 'react';
import { Box, CircularProgress, Grid } from '@mui/material';
import { VirtuosoGrid, Virtuoso } from 'react-virtuoso';
import { SongCard } from './SongCard';
import { SongListItem } from './SongListItem';
import { getSongItemActions } from './hooks/useSongItemActions';

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
    isSinger?: boolean;
    canDownload?: boolean;
}

export const OnlineSongsView: React.FC<OnlineSongsViewProps> = ({
    isSearchingOnline, viewMode, filteredOnlineSongs, songs, jobs,
    handleSelectSong, handleDownloadAndQueue, handleSongLongPress, handleDownloadOnly,
    isSinger, canDownload = true
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
                        const rawSong = filteredOnlineSongs[index];
                        const {
                            song,
                            isDownloaded,
                            isDownloading,
                            progress,
                            onClick,
                            onActionClick
                        } = getSongItemActions({
                            song: rawSong,
                            songs,
                            jobs,
                            isSinger,
                            canDownload,
                            handleSelectSong,
                            handleDownloadAndQueue,
                            handleDownloadOnly
                        });
                        return (
                            <SongCard
                                song={song}
                                isDownloading={isDownloading}
                                isDownloaded={isDownloaded}
                                downloadProgress={progress}
                                onClick={onClick}
                                onActionClick={onActionClick}
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
                    const rawSong = filteredOnlineSongs[index];
                    const {
                        song,
                        localSong,
                        isDownloaded,
                        isDownloading,
                        progress,
                        onClick,
                        onActionClick
                    } = getSongItemActions({
                        song: rawSong,
                        songs,
                        jobs,
                        isSinger,
                        canDownload,
                        handleSelectSong,
                        handleDownloadAndQueue,
                        handleDownloadOnly
                    });
                    return (
                        <Box sx={{ px: 2, py: 0.5 }}>
                            <SongListItem
                                song={song}
                                isDownloading={isDownloading}
                                isDownloaded={isDownloaded}
                                downloadProgress={progress}
                                onClick={onClick}
                                onMenuClick={isSinger ? undefined : () => {
                                    if (isDownloaded && localSong) handleSongLongPress(localSong);
                                }}
                                onActionClick={onActionClick}
                            />
                        </Box>
                    );
                }}
            />
        </Box>
    );
};
