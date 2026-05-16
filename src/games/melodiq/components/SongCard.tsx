import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { type SongMeta } from '../db';
import { formatDuration } from '../utils';

interface SongCardProps {
    song: SongMeta;
    onClick: () => void;
    onLongPress?: () => void;
}

/**
 * SongCard displays lightweight SongMeta for fast rendering.
 * Cover is loaded on-demand from the full Song table when visible.
 */
export const SongCard: React.FC<SongCardProps> = ({ song, onClick, onLongPress }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = React.useRef(false);

    const handleStart = () => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (onLongPress) {
                onLongPress();
            }
        }, 600); // 600ms threshold
    };

    const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
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
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick();
    };

    useEffect(() => {
        if (!song.hasCover) return;

        // Cover is now always a string URL from the helper
        if (typeof song.cover === 'string' && song.cover.length > 0) {
            setCoverUrl(song.cover);
        }
    }, [song.id, song.hasCover, song.cover]);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'scale(1.02)' },
                '&:focus': {
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
            </CardContent>
        </Card>
    );
};
