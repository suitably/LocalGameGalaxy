import React from 'react';
import { Box, Grid } from '@mui/material';
import { VirtuosoGrid, Virtuoso } from 'react-virtuoso';
import { SongCard } from './SongCard';
import { SongListItem } from './SongListItem';
import { type Song } from '../db';

interface LocalSongsViewProps {
    viewMode: 'list' | 'grid';
    filteredSongs: Song[];
    handleSelectSong: (song: Song) => void;
    handleSongLongPress: (song: Song) => void;
    isSinger?: boolean;
}

export const LocalSongsView: React.FC<LocalSongsViewProps> = ({
    viewMode, filteredSongs, handleSelectSong, handleSongLongPress, isSinger
}) => {
    if (filteredSongs.length === 0) return null;

    if (viewMode === 'grid') {
        return (
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <VirtuosoGrid
                    style={{ height: '100%', width: '100%' }}
                    totalCount={filteredSongs.length}
                    components={{
                        List: React.forwardRef((props, ref) => <Grid container spacing={2} {...props} ref={ref as any} id="song-grid" />),
                        Item: React.forwardRef((props, ref) => {
                            const cardSize = localStorage.getItem('melodiq_card_size') || 'small';
                            let gridProps: any = { xs: 6, sm: 4, md: 3, lg: 2 };

                            if (cardSize === 'medium') {
                                gridProps = { xs: 6, sm: 4, md: 4, lg: 3 };
                            } else if (cardSize === 'large') {
                                gridProps = { xs: 12, sm: 6, md: 4, lg: 3 };
                            } else if (cardSize === 'custom') {
                                try {
                                    const stored = localStorage.getItem('melodiq_custom_target_columns');
                                    const target = stored ? parseInt(stored) : 6;
                                    const lgItems = Math.max(1, target);
                                    const mdItems = Math.max(1, Math.round(target * 0.75));
                                    const smItems = Math.max(1, Math.round(target * 0.5));
                                    const xsItems = Math.max(1, Math.round(target * 0.33));
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
                                onClick={isSinger ? () => {} : () => handleSelectSong(song)}
                                onLongPress={isSinger ? undefined : () => handleSongLongPress(song)}
                            />
                        );
                    }}
                />
            </Box>
        );
    }

    return (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <Virtuoso
                style={{ height: '100%', width: '100%' }}
                totalCount={filteredSongs.length}
                itemContent={(index) => {
                    const song = filteredSongs[index];
                    return (
                        <Box sx={{ px: 2, py: 0.5 }}>
                            <SongListItem
                                song={song}
                                onClick={isSinger ? () => {} : () => handleSelectSong(song)}
                                onLongPress={isSinger ? undefined : () => handleSongLongPress(song)}
                                onMenuClick={isSinger ? undefined : () => handleSongLongPress(song)}
                            />
                        </Box>
                    );
                }}
            />
        </Box>
    );
};
