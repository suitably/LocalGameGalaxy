import React from 'react';
import {
  alpha,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Card,
  Badge,
  useTheme,
  Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import SkipNextIcon from '@mui/icons-material/SkipNextRounded';
import OpenInFullIcon from '@mui/icons-material/OpenInFullRounded';
import QueueMusicIcon from '@mui/icons-material/QueueMusicRounded';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import type { SongMeta, Song } from '../db';

interface MiniPlayerProps {
  song: SongMeta | Song | null;
  isPlaying: boolean;
  progress: number; // 0 to 100
  onTogglePlay: () => void;
  onNext: () => void;
  onMaximize: () => void;
  onShowQueue?: () => void;
  queueLength: number;
  isRestored?: boolean;
  isClient?: boolean;
  canControlPlayback?: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  song,
  isPlaying,
  progress,
  onTogglePlay,
  onNext,
  onMaximize,
  onShowQueue,
  queueLength,
  isRestored = false,

  canControlPlayback = true,
}) => {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.95),
        borderTop: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
        zIndex: 1200, // Higher than FAB but below Dialogs
        borderRadius: 0,
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
            bgcolor: theme.palette.secondary.main,
          },
        }}
      />

      {/* Song Info */}
      <Box
        sx={{ flexGrow: 1, overflow: 'hidden', mr: 2, cursor: song ? 'pointer' : 'default' }}
        onClick={() => {
          if (song && !isRestored) onMaximize();
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="subtitle2"
            noWrap
            sx={{ fontWeight: 'bold', color: song ? 'text.primary' : 'text.disabled' }}
          >
            {song ? song.title : 'No Song Playing'}
          </Typography>
          {isRestored && (
            <Chip
              label="Paused"
              size="small"
              sx={{
                height: 16,
                fontSize: '0.6rem',
                bgcolor: (theme) => alpha(theme.palette.text.primary, 0.12),
                color: 'text.secondary',
                flexShrink: 0,
              }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" noWrap>
          {song ? song.artist : 'Select a song or play from queue'}
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {canControlPlayback && (
          <>
            {isRestored ? (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay();
                }}
                size="medium"
                sx={{ color: theme.palette.secondary.main }}
                title="Resume song"
              >
                <PlayCircleOutlineIcon />
              </IconButton>
            ) : (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay();
                }}
                size="medium"
                sx={{ color: 'text.primary' }}
              >
                {isPlaying && song ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
            )}

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              size="medium"
              sx={{ color: 'text.primary' }}
            >
              <SkipNextIcon />
            </IconButton>
          </>
        )}

        {onShowQueue && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onShowQueue();
            }}
            size="medium"
            sx={{ color: 'text.primary' }}
          >
            <Badge
              badgeContent={queueLength}
              color="primary"
              max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: '0.65rem', minWidth: 16, height: 16 } }}
            >
              <QueueMusicIcon fontSize="small" />
            </Badge>
          </IconButton>
        )}

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onMaximize();
          }}
          size="medium"
          sx={{ color: 'text.primary', ml: 1 }}
          disabled={!song}
        >
          <OpenInFullIcon fontSize="small" />
        </IconButton>
      </Box>
    </Card>
  );
};
