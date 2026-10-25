/**
 * A bag on the table: tap to draw, drag to take an item, long press to move [ID: COMP-TABLETOP-BAG-VIEW]
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import type { BagWidget } from '../../logic/types';

interface BagWidgetViewProps {
  widget: BagWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onDraw?: () => void;
}

export const BagWidgetView: React.FC<BagWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onDraw,
}) => {
  const count = widget.isInfinite ? '∞' : String(widget.itemCount ?? widget.itemIds?.length ?? 0);
  const empty = !widget.isInfinite && count === '0';

  return (
    <Box
      onPointerDown={onPointerDown}
      // On the table the engine handles taps and drags (tap: item next to the bag, drag: take one).
      onClick={
        onPointerDown
          ? undefined
          : (e) => {
              e.stopPropagation();
              if (!empty) onDraw?.();
            }
      }
      title={widget.label || widget.previewLabel}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        borderRadius: '50% 50% 45% 45%',
        bgcolor: widget.color || 'grey.700',
        backgroundImage: widget.previewImage ? `url(${widget.previewImage})` : undefined,
        backgroundSize: '60%',
        backgroundPosition: 'center 60%',
        backgroundRepeat: 'no-repeat',
        boxShadow: isDragging ? 8 : 4,
        border: '2px solid rgba(0,0,0,0.35)',
        cursor: empty ? 'default' : 'pointer',
        opacity: empty ? 0.5 : 1,
        userSelect: 'none',
        transform: isDragging ? 'scale(1.08)' : 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          minWidth: 24,
          height: 24,
          px: 0.5,
          borderRadius: 12,
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 2,
        }}
      >
        <Typography variant="caption" fontWeight={700}>
          {count}
        </Typography>
      </Box>
      {widget.label && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: -18,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'common.white',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {widget.label}
        </Typography>
      )}
    </Box>
  );
};
