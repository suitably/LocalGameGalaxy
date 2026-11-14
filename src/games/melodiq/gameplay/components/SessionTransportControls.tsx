import React from 'react';
import { Box, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import SkipNextIcon from '@mui/icons-material/SkipNextRounded';
import { useTranslation } from 'react-i18next';

export interface SessionTransportControlsProps {
  visible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  /** Omitted where the stage cannot skip. */
  onNext?: () => void;
}

/* Sits on the video like a video player's controls: dark scrim buttons, always light icons. */
const buttonSx = {
  color: 'common.white',
  bgcolor: 'rgba(0,0,0,0.55)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
} as const;

/** Play/pause and next, centred on the stage; shown with the rest of the stage chrome. */
export const SessionTransportControls: React.FC<SessionTransportControlsProps> = ({
  visible,
  isPlaying,
  onTogglePlay,
  onNext,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }}
    >
      {/* Mirrors the next button so play/pause stays centred */}
      {onNext && <Box sx={{ width: 48 }} />}
      <IconButton
        aria-label={t('melodiq.play_pause')}
        onClick={onTogglePlay}
        tabIndex={visible ? 0 : -1}
        sx={{ ...buttonSx, width: 72, height: 72, pointerEvents: visible ? 'auto' : 'none' }}
      >
        {isPlaying ? <PauseIcon sx={{ fontSize: 44 }} /> : <PlayArrowIcon sx={{ fontSize: 44 }} />}
      </IconButton>
      {onNext && (
        <IconButton
          aria-label={t('melodiq.next')}
          onClick={onNext}
          tabIndex={visible ? 0 : -1}
          sx={{ ...buttonSx, width: 48, height: 48, pointerEvents: visible ? 'auto' : 'none' }}
        >
          <SkipNextIcon />
        </IconButton>
      )}
    </Box>
  );
};
