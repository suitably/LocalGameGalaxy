/**
 * Countdown or stopwatch with start/pause and reset [ID: COMP-TABLETOP-TIMER-VIEW]
 */
import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { scoreText } from '../../../../themeTokens';
import PlayArrowIcon from '@mui/icons-material/PlayArrowRounded';
import PauseIcon from '@mui/icons-material/PauseRounded';
import RestartAltIcon from '@mui/icons-material/RestartAltRounded';
import type { TimerWidget } from '../../logic/types';
import { formatTimer, timerDisplayMs } from '../../logic/tableTools';

interface TimerWidgetViewProps {
  widget: TimerWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onToggle: () => void;
  onReset: () => void;
}

const stop = (e: React.PointerEvent) => e.stopPropagation();

export const TimerWidgetView: React.FC<TimerWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onToggle,
  onReset,
}) => {
  const running = widget.runningSince !== undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // `now` only matters while running; paused timers ignore it.
  const shown = timerDisplayMs(widget, now);
  const finished = widget.durationMs > 0 && shown === 0;

  return (
    <Box
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        bgcolor: finished ? 'error.dark' : 'grey.900',
        color: 'common.white',
        borderRadius: 2,
        boxShadow: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1,
        userSelect: 'none',
      }}
    >
      <Typography sx={{ ...scoreText, fontSize: 22, fontWeight: 700 }}>
        {formatTimer(shown)}
      </Typography>
      <Box>
        <IconButton size="small" color="inherit" onPointerDown={stop} onClick={onToggle}>
          {running ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" color="inherit" onPointerDown={stop} onClick={onReset}>
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};
