import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CircularProgress from '@mui/material/CircularProgress';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { type SongMeta } from '../db';
import { formatDuration } from '../utils';
import { useTranslation } from 'react-i18next';

interface SongListItemProps {
    song: SongMeta;
    onClick: () => void;
    onActionClick?: (e: React.MouseEvent) => void;
    isDownloading?: boolean;
    isDownloaded?: boolean;
    downloadProgress?: number;
    hasActiveJob?: boolean;
    activeJobType?: string;
}

export const SongListItem: React.FC<SongListItemProps> = ({ song, onClick, onActionClick, isDownloading, isDownloaded, downloadProgress, hasActiveJob, activeJobType }) => {
    const { t } = useTranslation();

    const rawCover = song.cover || song.coverThumbnail;
    const coverUrl = (typeof rawCover === 'string' && rawCover.length > 0)
        ? rawCover
        : null;

    const handleClick = () => {
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                        {song.artist}
                    </Typography>
                    {(song.duration || song.year) && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: { xs: 'inline', sm: 'none' }, opacity: 0.8, flexShrink: 0 }}
                        >
                            • {[song.year, song.duration ? formatDuration(song.duration) : null].filter(Boolean).join(' • ')}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Metadata (Hidden on very small screens) */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                {song.source === 'local' && (
                    <Typography variant="body2" sx={{ bgcolor: 'primary.dark', color: 'white', px: 1, borderRadius: 4, fontSize: '0.75rem' }}>
                        {t('melodiq.local_song_badge', 'Lokal')}
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

            {/* Download / AI Status */}
            {(isDownloading || hasActiveJob) && (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, mr: 1 }}>
                    {hasActiveJob && (activeJobType === 'full-sync' || activeJobType === 'separate') ? (
                        <Chip
                            icon={<AutoAwesomeIcon sx={{ fontSize: 16, color: '#ffeb3b !important' }} />}
                            label={`${downloadProgress !== undefined && downloadProgress > 0 ? `${downloadProgress}% ` : ''}${
                                activeJobType === 'full-sync'
                                    ? t('melodiq.ai_sync_active', 'KI-Sync')
                                    : t('melodiq.vocal_separation_active', 'Vokaltrennung')
                            }`}
                            size="small"
                            color="secondary"
                            sx={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                height: 24,
                            }}
                        />
                    ) : (
                        <CircularProgress variant={downloadProgress && downloadProgress > 0 ? "determinate" : "indeterminate"} value={downloadProgress || 0} size={24} />
                    )}
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
        </Box>
    );
};
