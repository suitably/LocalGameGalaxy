import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import { formatDuration } from '../utils';
import { useTranslation } from 'react-i18next';
import { SongCardCorner, SongCardProgress } from './SongCardStatus';

/** Fields of a library song or USDB search result that the card displays. */
export interface SongCardSong {
  title: string;
  artist: string;
  duration?: number;
  year?: string;
  genre?: string;
  source?: string;
  usdbId?: number;
  hasCover?: boolean;
  cover?: unknown;
  coverThumbnail?: unknown;
}

interface SongCardProps {
  song: SongCardSong;
  onClick: () => void;
  onActionClick?: (e: React.MouseEvent) => void;
  isDownloading?: boolean;
  isDownloaded?: boolean;
  downloadProgress?: number;
  hasActiveJob?: boolean;
  activeJobType?: string;
}

const tagSx = { px: 0.5, borderRadius: 0.5, fontSize: '0.65rem' } as const;

/**
 * SongCard displays lightweight SongMeta for fast rendering.
 * Cover is loaded on-demand from the full Song table when visible.
 */
export const SongCard: React.FC<SongCardProps> = ({
  song,
  onClick,
  onActionClick,
  isDownloading,
  isDownloaded,
  downloadProgress,
  hasActiveJob,
  activeJobType,
}) => {
  const { t } = useTranslation();

  const rawCover = song.cover || song.coverThumbnail;
  const coverUrl =
    song.hasCover !== false && typeof rawCover === 'string' && rawCover.length > 0
      ? rawCover
      : null;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isDownloading ? 'default' : 'pointer',
        opacity: isDownloading ? 0.6 : 1,
        pointerEvents: isDownloading ? 'none' : 'auto',
        transition: 'transform 0.2s',
        '&:hover': isDownloading ? {} : { transform: 'scale(1.02)' },
        '&:focus': isDownloading
          ? {}
          : {
              outline: '3px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
              transform: 'scale(1.05)',
              zIndex: 1,
            },
        position: 'relative',
      }}
      tabIndex={0}
      onClick={() => {
        if (!isDownloading) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1 / 1',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={song.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <MusicNoteIcon sx={{ fontSize: 40, opacity: 0.2 }} />
        )}
      </Box>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography
          variant="subtitle2"
          noWrap
          title={song.title}
          sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
        >
          {song.title}
        </Typography>
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          noWrap
          title={song.artist}
          sx={{ lineHeight: 1.2 }}
        >
          {song.artist}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: '0.7rem', fontVariantNumeric: 'tabular-nums' }}
          >
            {song.duration ? formatDuration(song.duration) : '0:00'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {song.source === 'local' && (
              <Typography
                variant="caption"
                sx={{ ...tagSx, bgcolor: 'primary.main', color: 'primary.contrastText' }}
              >
                {t('melodiq.local_song_badge', 'Lokal')}
              </Typography>
            )}
            {song.year && (
              <Typography variant="caption" sx={{ ...tagSx, bgcolor: 'action.selected' }}>
                {song.year}
              </Typography>
            )}
            {song.genre && (
              <Typography
                variant="caption"
                sx={{ ...tagSx, bgcolor: 'action.selected', maxWidth: 60 }}
                noWrap
                title={song.genre}
              >
                {song.genre}
              </Typography>
            )}
          </Box>
        </Box>
        <SongCardCorner
          hasUsdbId={Boolean(song.usdbId)}
          onActionClick={onActionClick}
          isDownloading={isDownloading}
          isDownloaded={isDownloaded}
          downloadProgress={downloadProgress}
          hasActiveJob={hasActiveJob}
          activeJobType={activeJobType}
        />
        {(isDownloading || hasActiveJob) && (
          <SongCardProgress
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            activeJobType={activeJobType}
          />
        )}
      </CardContent>
    </Card>
  );
};
