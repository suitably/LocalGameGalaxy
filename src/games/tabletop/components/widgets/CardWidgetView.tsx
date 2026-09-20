import React from 'react';
import { Box } from '@mui/material';
import type { CardWidget } from '../../logic/types';
import { PlayingCardFace } from './PlayingCardFace';

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
  const hasClipPath = Boolean(widget.clipPath);

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
        borderRadius: hasClipPath ? 0 : 2,
        boxShadow: hasClipPath ? 'none' : isDragging ? 8 : 3,
        filter: hasClipPath && isDragging ? 'drop-shadow(0 8px 12px rgba(0,0,0,0.5))' : 'none',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
        transform: `rotate(${widget.rotation || 0}deg) ${isDragging ? 'scale(1.05)' : ''}`,
        border: hasClipPath ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
        overflow: 'hidden',
        bgcolor: hasClipPath ? 'transparent' : '#fff',
        clipPath: widget.clipPath,
      }}
    >
      {hasClipPath && widget.frontContent.type === 'image' ? (
        <Box
          component="img"
          src={widget.frontContent.value}
          alt={widget.label || 'Tile'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <PlayingCardFace
          frontContent={widget.frontContent}
          backContent={widget.backContent}
          isFaceUp={isFaceUp}
          label={widget.label}
          width={widget.width}
          height={widget.height}
        />
      )}
    </Box>
  );
};
