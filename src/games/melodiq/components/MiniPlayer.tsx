import React from 'react';
import { Box, Typography, IconButton, LinearProgress, Card, Badge, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import type { SongMeta, Song } from '../db';

interface MiniPlayerProps {
    song: SongMeta | Song | null;
    isPlaying: boolean;
    progress: number; // 0 to 100
    onTogglePlay: () => void;
    onNext: () => void;
    onMaximize: () => void;
    onShowQueue: () => void;
    queueLength: number;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
    song,
    isPlaying,
    progress,
    onTogglePlay,
    onNext,
    onMaximize,
    onShowQueue,
    queueLength
}) => {
    const theme = useTheme();

    return (
        <Card
            elevation={8}
            sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                px: 2,
                bgcolor: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 1200, // Higher than FAB but below Dialogs
                borderRadius: 0
            }}
        >
            {/* Progress Bar moved to top edge */}
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    bgcolor: 'transparent',
                    '& .MuiLinearProgress-bar': {
                        bgcolor: theme.palette.secondary.main
                    }
                }}
            />

            {/* Song Info */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', mr: 2, cursor: song ? 'pointer' : 'default' }} onClick={() => { if (song) onMaximize(); }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 'bold', color: song ? 'text.primary' : 'text.disabled' }}>
                    {song ? song.title : 'No Song Playing'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {song ? song.artist : 'Select a song or play form queue'}
                </Typography>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} size="medium" sx={{ color: 'white' }}>
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>

                <IconButton onClick={(e) => { e.stopPropagation(); onNext(); }} size="medium" sx={{ color: 'white' }}>
                    <SkipNextIcon />
                </IconButton>

                <IconButton onClick={(e) => { e.stopPropagation(); onShowQueue(); }} size="medium" sx={{ color: 'white' }}>
                    <Badge badgeContent={queueLength} color="primary" max={99}
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}
                    >
                        <QueueMusicIcon fontSize="small" />
                    </Badge>
                </IconButton>

                <IconButton onClick={(e) => { e.stopPropagation(); onMaximize(); }} size="medium" sx={{ color: 'white', ml: 1 }} disabled={!song}>
                    <OpenInFullIcon fontSize="small" />
                </IconButton>
            </Box>
        </Card>
    );
};
