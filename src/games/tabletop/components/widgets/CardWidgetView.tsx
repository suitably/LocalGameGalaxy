import React from 'react';
import { alpha, Box } from '@mui/material';
import type { CardWidget } from '../../logic/types';
import { CardFaceContent, FaceObjectsLayer } from './CardFaceContent';

export { FaceObjectsLayer };

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
  const showFaceObjects = Boolean(widget.faceObjects && widget.faceObjects.length > 0 && isFaceUp);
  const showBackFaceObjects = Boolean(
    widget.backFaceObjects && widget.backFaceObjects.length > 0 && !isFaceUp,
  );
  const showFallbackObjects = Boolean(
    isFaceUp && !showFaceObjects && widget.backFaceObjects && widget.backFaceObjects.length > 0,
  );
  const isUnstyledContainer = Boolean(
    showFaceObjects ||
    showBackFaceObjects ||
    showFallbackObjects ||
    hasClipPath ||
    widget.isTransparent,
  );

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
        zIndex: widget.zIndex + (isDragging ? 500000 : 0),
        borderRadius: isUnstyledContainer ? 0 : 2,
        boxShadow: isUnstyledContainer ? 'none' : isDragging ? 8 : 3,
        filter: isUnstyledContainer
          ? isDragging
            ? 'drop-shadow(0 8px 14px rgba(0,0,0,0.55))'
            : 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'
          : 'none',
        cursor: widget.movable === false ? 'default' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.2s',
        transform: `rotate(${widget.rotation || 0}deg) ${isDragging ? 'scale(1.05)' : ''}`,
        border: isUnstyledContainer ? 'none' : '1.5px solid rgba(0,0,0,0.18)',
        overflow:
          showFaceObjects || showBackFaceObjects || showFallbackObjects ? 'visible' : 'hidden',
        bgcolor: isUnstyledContainer ? 'transparent' : '#fff',
        clipPath:
          showFaceObjects || showBackFaceObjects || showFallbackObjects
            ? undefined
            : widget.clipPath,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      {/* Re-mounting on flip replays the flip animation from TableMotionStyles. */}
      <Box key={String(isFaceUp)} data-card-flip="" sx={{ width: '100%', height: '100%' }}>
        <CardFaceContent card={widget} isFaceUp={isFaceUp} />
      </Box>

      {widget.stackCount && widget.stackCount > 1 ? (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.92),
            color: 'text.primary',
            borderRadius: '10px',
            px: 0.8,
            py: 0.2,
            fontSize: '0.72rem',
            fontWeight: 800,
            lineHeight: 1.2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
            border: (theme) => `1px solid ${alpha(theme.palette.text.primary, 0.4)}`,
            zIndex: 20,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {`×${widget.stackCount}`}
        </Box>
      ) : null}
    </Box>
  );
};
