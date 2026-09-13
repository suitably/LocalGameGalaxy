import React from 'react';
import { Box, Typography } from '@mui/material';
import type { CardWidget } from '../../logic/types';

interface CardWidgetViewProps {
  widget: CardWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDoubleClick?: () => void;
}

export const CardWidgetView: React.FC<CardWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onDoubleClick,
}) => {
  const isFaceUp = widget.faceUp;
  const content = isFaceUp ? widget.frontContent : widget.backContent;

  return (
    <Box
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        borderRadius: 2,
        boxShadow: isDragging ? 8 : 3,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
        transform: `rotate(${widget.rotation || 0}deg) ${isDragging ? 'scale(1.05)' : ''}`,
        bgcolor: isFaceUp ? '#fff' : (widget.backContent.color || '#1565c0'),
        color: isFaceUp ? (widget.frontContent.color || '#111') : '#fff',
        border: '1.5px solid',
        borderColor: isFaceUp ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0.5,
        overflow: 'hidden',
      }}
    >
      {content.type === 'image' ? (
        <Box
          component="img"
          src={content.value}
          alt={widget.label || 'Card'}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        <Typography
          variant="body1"
          fontWeight={700}
          textAlign="center"
          sx={{ fontSize: widget.width < 70 ? '0.85rem' : '1.1rem', wordBreak: 'break-word' }}
        >
          {content.value}
        </Typography>
      )}
    </Box>
  );
};
