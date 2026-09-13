import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { CounterWidget } from '../../logic/types';

interface CounterWidgetViewProps {
  widget: CounterWidget;
  onIncrement?: () => void;
  onDecrement?: () => void;
}

export const CounterWidgetView: React.FC<CounterWidgetViewProps> = ({
  widget,
  onIncrement,
  onDecrement,
}) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 0.5,
        border: '1.5px solid',
        borderColor: 'divider',
        userSelect: 'none',
      }}
    >
      <IconButton size="small" onClick={onDecrement} color="primary" sx={{ p: 0.5 }}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Box textAlign="center">
        <Typography variant="subtitle2" fontWeight={800} color="text.primary">
          {widget.value}
        </Typography>
        {widget.label && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {widget.label}
          </Typography>
        )}
      </Box>
      <IconButton size="small" onClick={onIncrement} color="primary" sx={{ p: 0.5 }}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};
