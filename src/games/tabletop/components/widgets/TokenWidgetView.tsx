import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import type { TokenWidget } from '../../logic/types';
import { recolorSvgDataUri, fetchAndRecolorSvg } from '../../logic/svgColorUtils';

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
  const isChip = Boolean(widget.subText !== undefined && widget.label);
  const rot = widget.rotation || 0;

  const [recoloredSrc, setRecoloredSrc] = useState<string | undefined>(() => {
    if (!widget.image || !widget.color) return widget.image;
    if (widget.image.startsWith('data:image/svg+xml')) {
      return recolorSvgDataUri(widget.image, widget.color) || widget.image;
    }
    return widget.image;
  });

  useEffect(() => {
    if (!widget.image || !widget.color) return;
    let cancelled = false;
    fetchAndRecolorSvg(widget.image, widget.color).then((src) => {
      if (!cancelled) setRecoloredSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [widget.image, widget.color]);

  // Render Image Token (e.g. Robber, custom meeples, pieces)
  if (widget.image) {
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
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${rot}deg) ${isDragging ? 'scale(1.15)' : ''}`,
          filter: isDragging ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          transition: isDragging ? 'none' : 'filter 0.2s, transform 0.15s ease',
        }}
      >
        <Box
          component="img"
          src={recoloredSrc || widget.image}
          alt={widget.label || 'Token'}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      </Box>
    );
  }

  // Render Catan-style Number Chip
  if (isChip) {
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
          borderRadius: '50%',
          bgcolor: widget.color || '#ECCCA0',
          boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.5)' : '2px 2px 4px rgba(0,0,0,0.4)',
          border: '1.5px solid rgba(0,0,0,0.2)',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${rot}deg) ${isDragging ? 'scale(1.15)' : ''}`,
          transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.15s ease',
        }}
      >
        <Typography
          sx={{
            fontSize: '1.2rem',
            fontWeight: 900,
            lineHeight: 1,
            color: widget.textColor || '#3e2723',
          }}
        >
          {widget.label}
        </Typography>
        {widget.subText && (
          <Typography
            sx={{
              fontSize: '1.1rem',
              fontWeight: 900,
              lineHeight: 0.7,
              letterSpacing: 1,
              color: widget.textColor || '#3e2723',
              mt: 0.2,
            }}
          >
            {widget.subText}
          </Typography>
        )}
      </Box>
    );
  }

  // Standard Generic Token
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
        boxShadow: isDragging ? 10 : 3,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid rgba(255,255,255,0.8)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.15s ease',
        transform: `rotate(${rot}deg) ${isDragging ? 'scale(1.15)' : ''}`,
      }}
    >
      <Box
        sx={{
          width: '74%',
          height: '74%',
          borderRadius: isCircle ? '50%' : 1,
          border: '1.5px solid rgba(255,255,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        {widget.label && (
          <Typography variant="caption" fontWeight={900} sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {widget.label}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
