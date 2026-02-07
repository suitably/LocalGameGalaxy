import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import db, { type SongMeta } from '../db';
import { formatDuration } from '../utils';

interface SongCardProps {
    song: SongMeta;
    onClick: () => void;
}

/**
 * SongCard displays lightweight SongMeta for fast rendering.
 * Cover is loaded on-demand from the full Song table when visible.
 */
export const SongCard: React.FC<SongCardProps> = ({ song, onClick }) => {
    const [coverUrl, setCoverUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let objectUrl: string | null = null;

        const loadCover = async () => {
            if (!song.hasCover) return;

            // 1. If we already have a string URL (Server/Remote song), use it directly
            if (typeof song.cover === 'string' && song.cover.length > 0) {
                setCoverUrl(song.cover);
                return;
            }

            try {
                // 2. Load full song to get cover handle/blob (Local song)
                const fullSong = await db.songs.get(song.id);
                if (!fullSong?.cover || !active) return;

                if (typeof fullSong.cover === 'string') {
                    setCoverUrl(fullSong.cover);
                } else if (fullSong.cover instanceof Blob) {
                    objectUrl = URL.createObjectURL(fullSong.cover);
                    if (active) setCoverUrl(objectUrl);
                } else if ('getFile' in fullSong.cover && typeof fullSong.cover.getFile === 'function') {
                    // @ts-ignore
                    const file = await (fullSong.cover as FileSystemFileHandle).getFile();
                    if (active) {
                        objectUrl = URL.createObjectURL(file);
                        setCoverUrl(objectUrl);
                    }
                }
            } catch (e) {
                console.warn("Failed to load cover", e);
            }
        };

        loadCover();

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [song.id, song.hasCover]);

    return (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.02)' }
            }}
            onClick={onClick}
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
