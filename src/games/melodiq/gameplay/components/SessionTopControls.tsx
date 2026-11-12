import React from 'react';
import { alpha, Box, Typography, IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { ScoreDisplay, type ScoreDisplayHandle } from '../ScoreDisplay';
import { type PlayerRuntime } from '../hooks/PlayerRuntime';

export interface SessionTopControlsProps {
  artist: string;
  title: string;
  uiScale?: number;
  isTVMode?: boolean;
  onMinimize?: () => void;
  scoreDisplayRef: React.RefObject<ScoreDisplayHandle | null>;
  visiblePlayers: PlayerRuntime[];
  progressLineRef: React.RefObject<HTMLDivElement | null>;
  isUIVisible?: boolean;
}

export const SessionTopControls: React.FC<SessionTopControlsProps> = ({
  artist,
  title,
  uiScale = 1.0,
  isTVMode = false,
  onMinimize,
  scoreDisplayRef,
  visiblePlayers,
  progressLineRef,
  isUIVisible = true,
}) => {
  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 20,
          p: { xs: 1, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          bgcolor: 'rgba(0,0,0,0.5)',
          pointerEvents: isUIVisible ? 'auto' : 'none',
          opacity: isUIVisible ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {onMinimize && !isTVMode && (
            <IconButton onClick={onMinimize} color="inherit" sx={{ ml: 1 }}>
              <KeyboardArrowDownIcon />
            </IconButton>
          )}
        </Box>
        {isTVMode ? (
          // the TV theme scales the variant (x1.5, 20px floor); no hard-coded size (#554)
          <Typography variant="h6">
            {artist} - {title}
          </Typography>
        ) : (
          // Phone and desktop: one line each, so a long title never pushes the stage down.
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {artist}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 4, pointerEvents: 'none', flexShrink: 0 }}>
          <ScoreDisplay
            ref={scoreDisplayRef}
            players={visiblePlayers.map((p) => ({
              id: p.config.id,
              name: p.config.name,
              hue: p.config.hue,
            }))}
            scale={uiScale}
          />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          bgcolor: (theme) => alpha(theme.palette.text.primary, 0.2),
          zIndex: 100,
          pointerEvents: 'none',
          opacity: isUIVisible ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
        }}
      >
        <Box
          ref={progressLineRef}
          sx={{
            width: '100%',
            height: '100%',
            bgcolor: 'primary.main',
            // Not width: that repaints over the video every frame, which drops frames on a 4K clip
            transform: 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 0.1s linear',
          }}
        />
      </Box>
    </>
  );
};
