import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import { type SongMeta } from '../db';
import { formatDuration } from '../utils';

interface SongListItemProps {
    song: SongMeta;
    onClick: () => void;
    onLongPress?: () => void;
    onMenuClick?: (e: React.MouseEvent) => void;
    onActionClick?: (e: React.MouseEvent) => void;
    isDownloading?: boolean;
    isDownloaded?: boolean;
    downloadProgress?: number;
    hasActiveJob?: boolean;
}

export const SongListItem: React.FC<SongListItemProps> = ({ song, onClick, onLongPress, onMenuClick, onActionClick, isDownloading, isDownloaded, downloadProgress, hasActiveJob }) => {
    const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = React.useRef(false);

    const coverUrl = (song.hasCover && typeof song.cover === 'string' && song.cover.length > 0)
        ? song.cover
        : null;

    const handleStart = () => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (onLongPress) {
                onLongPress();
            }
        }, 600);
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    };

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                gap: 2,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': {
                    bgcolor: 'action.hover'
                },
                '&:active': {
                    bgcolor: 'action.selected'
                },
                opacity: isDownloading ? 0.6 : 1,
                pointerEvents: isDownloading ? 'none' : 'auto',
            }}
            onClick={handleClick}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
        >
            {/* Cover Art */}
            <Box sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                bgcolor: 'action.selected',
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {coverUrl ? (
                    <img src={coverUrl} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <MusicNoteIcon sx={{ fontSize: 24, opacity: 0.3 }} />
                )}
            </Box>

            {/* Song Details */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
                    {song.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                    {song.artist}
                </Typography>
            </Box>

            {/* Metadata (Hidden on very small screens) */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                {(song.hasSeparation || song.vocalsAudio) && (
                    <Typography variant="body2" sx={{ bgcolor: 'rgba(156, 39, 176, 0.15)', color: '#ce93d8', px: 0.8, py: 0.2, borderRadius: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
                        🎤 Stems
                    </Typography>
                )}
                {song.duration && (
                    <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                        {formatDuration(song.duration)}
                    </Typography>
                )}
                {song.year && (
                    <Typography variant="body2" sx={{ bgcolor: 'action.selected', px: 1, borderRadius: 4, fontSize: '0.75rem' }}>
                        {song.year}
                    </Typography>
                )}
            </Box>

            {/* Download Status */}
            {(isDownloading || hasActiveJob) && (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mr: 1 }}>
                    <CircularProgress variant={downloadProgress && downloadProgress > 0 ? "determinate" : "indeterminate"} value={downloadProgress || 0} size={24} />
                </Box>
            )}

            {/* Downloaded Icon */}
            {isDownloaded && !isDownloading && (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, color: 'success.main' }}>
                    <CheckCircleIcon />
                </Box>
            )}

            {/* Cloud Icon for Online Search Items */}
            {!isDownloading && !isDownloaded && song.usdbId && onActionClick && (
                <IconButton 
                    size="small" 
                    sx={{ ml: 1, color: 'primary.main' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onActionClick(e);
                    }}
                >
                    <CloudDownloadIcon />
                </IconButton>
            )}

            {/* Menu Action (for touch devices mainly, or standard access) */}
            {onMenuClick && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenuClick(e);
                    }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
};
