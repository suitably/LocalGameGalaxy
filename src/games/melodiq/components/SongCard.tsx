import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { type SongMeta } from '../db';
import { formatDuration } from '../utils';

interface SongCardProps {
    song: SongMeta | any; // Allow USDB songs too
    onClick: () => void;
    onLongPress?: () => void;
    isDownloading?: boolean;
    downloadProgress?: number;
}

/**
 * SongCard displays lightweight SongMeta for fast rendering.
 * Cover is loaded on-demand from the full Song table when visible.
 */
export const SongCard: React.FC<SongCardProps> = ({ song, onClick, onLongPress, isDownloading, downloadProgress }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = React.useRef(false);

    const handleStart = () => {
        if (isDownloading) return;
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (onLongPress) {
                onLongPress();
            }
        }, 600); // 600ms threshold
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (isDownloading) return;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        // If it was a long press, prevent the click
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDownloading) return;
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    };

    useEffect(() => {
        // Handle both local songs (song.hasCover) and usdb songs (no cover logic yet)
        if (song.hasCover === false) return;
        if (song.cover && typeof song.cover === 'string' && song.cover.length > 0) {
            setCoverUrl(song.cover);
        }
    }, [song.id, song.hasCover, song.cover]);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: isDownloading ? 'default' : 'pointer',
                opacity: isDownloading ? 0.6 : 1,
                pointerEvents: isDownloading ? 'none' : 'auto',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': isDownloading ? {} : { transform: 'scale(1.02)' },
                '&:focus': isDownloading ? {} : {
                    outline: 'none',
                    transform: 'scale(1.05)',
                    boxShadow: '0 0 0 4px #FE6B8B', // High visibility focus ring
                    zIndex: 1
                }
            }}
            tabIndex={0}
            onClick={handleClick}
            onMouseDown={handleStart}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            onContextMenu={(e) => {
                // Prevent context menu on long press if we handled it
                if (isLongPressRef.current) e.preventDefault();
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
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

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                        {song.duration ? formatDuration(song.duration) : '0:00'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {song.year && (
                            <Typography variant="caption" sx={{ bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5, fontSize: '0.65rem' }}>
                                {song.year}
                            </Typography>
                        )}
                        {song.genre && (
                            <Typography variant="caption" sx={{ bgcolor: 'action.selected', px: 0.5, borderRadius: 0.5, fontSize: '0.65rem', maxWidth: 60 }} noWrap title={song.genre}>
                                {song.genre}
                            </Typography>
                        )}
                    </Box>
                </Box>
                {isDownloading && (
                    <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="primary">{downloadProgress}% Downloading...</Typography>
                        <LinearProgress variant={downloadProgress !== undefined && downloadProgress > 0 ? "determinate" : "indeterminate"} value={downloadProgress} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
