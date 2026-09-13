import React from 'react';
import { Box, Typography } from '@mui/material';
import type { TokenWidget } from '../../logic/types';

interface TokenWidgetViewProps {
  widget: TokenWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const TokenWidgetView: React.FC<TokenWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
}) => {
  const isCircle = widget.shape === 'circle' || !widget.shape;

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
        borderRadius: isCircle ? '50%' : 1.5,
        bgcolor: widget.color || '#ffb300',
        color: '#fff',
        boxShadow: isDragging ? 6 : 2,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid rgba(255,255,255,0.7)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        transform: isDragging ? 'scale(1.15)' : 'none',
      }}
    >
      {widget.label && (
        <Typography variant="caption" fontWeight={700} sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          {widget.label}
        </Typography>
      )}
    </Box>
  );
};
