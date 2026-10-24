import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface ScoreBoardFooterProps {
  isPassive?: boolean;
  queueLength: number;
  nextTitle?: string;
  countdown: number | null;
  onExit: (forceHome?: boolean) => void;
  onResume?: () => void;
  onCancelAutoPlay: () => void;
}

export const ScoreBoardFooter: React.FC<ScoreBoardFooterProps> = ({
  isPassive,
  queueLength,
  nextTitle,
  countdown,
  onExit,
  onResume,
  onCancelAutoPlay,
}) => {
  if (isPassive) {
    return (
      <Box sx={{ mt: 3, pt: 2, display: 'flex', justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          Waiting for Host to continue...
        </Typography>
      </Box>
    );
  }

  const countdownLabel = countdown !== null ? ` (${countdown}s)` : '';
  const primaryLabel =
    queueLength > 0
      ? `NEXT: ${nextTitle ?? ''}${countdownLabel}`.toUpperCase()
      : `CONTINUE${countdownLabel}`;

  return (
    <Box
      sx={{
        mt: 3,
        pt: 2,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      {onResume && (
        <Button
          variant="outlined"
          color="inherit"
          size="large"
          onClick={onResume}
          startIcon={<PlayArrowIcon />}
          sx={{ px: 4 }}
        >
          Resume
        </Button>
      )}
      {queueLength > 0 && (
        <Button
          variant="outlined"
          color="inherit"
          size="large"
          onClick={() => onExit(true)}
          sx={{ px: 4 }}
        >
          Main Menu
        </Button>
      )}
      {countdown !== null && (
        <Button
          variant="outlined"
          color="inherit"
          size="large"
          onClick={onCancelAutoPlay}
          sx={{ px: 4 }}
        >
          Cancel Auto-Skip
        </Button>
      )}
      <Button
        variant="contained"
        size="large"
        onClick={() => onExit(false)}
        sx={{ px: 6, py: 1.5, fontSize: '1.2rem' }}
      >
        {primaryLabel}
      </Button>
    </Box>
  );
};
