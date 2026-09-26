import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { DeckWidget, CardWidget } from '../../logic/types';
import { CardFaceContent } from './CardFaceContent';

interface DeckWidgetViewProps {
  widget: DeckWidget;
  onDraw?: () => void;
  onShuffle?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  isDragging?: boolean;
}

export const DeckWidgetView: React.FC<DeckWidgetViewProps> = ({
  widget,
  onDraw,
  onShuffle,
  onPointerDown,
  isDragging,
}) => {
  const { t } = useTranslation();
  const count = widget.cardIds?.length || 0;
  const isEmpty = count === 0;

  const hasFront = widget.faceUp === true || (widget.activeFace !== undefined && widget.activeFace > 0);
  const rot = widget.rotation || 0;

  return (
    <Box
      onPointerDown={onPointerDown}
      onClick={!onPointerDown && !isEmpty ? onDraw : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onShuffle?.();
      }}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex,
        borderRadius: 2,
        boxShadow: isDragging 
          ? '0 10px 25px rgba(0,0,0,0.5)' 
          : isEmpty
          ? 1
          : '1px 1px 0 rgba(255,255,255,0.8), 2px 2px 0 #1e3a8a, 3px 3px 0 rgba(255,255,255,0.8), 4px 4px 0 #1e3a8a, 6px 6px 14px rgba(0,0,0,0.45)',
        cursor: widget.movable !== false ? 'grab' : isEmpty ? 'default' : 'pointer',
        userSelect: 'none',
        bgcolor: isEmpty ? 'rgba(0,0,0,0.1)' : '#fff',
        border: '1.5px solid rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: isDragging ? 'none' : 'transform 0.1s ease',
        transform: isDragging ? `rotate(${rot}deg) scale(1.05)` : rot ? `rotate(${rot}deg)` : undefined,
        overflow: 'hidden',
        '&:active': {
          transform: isDragging ? `rotate(${rot}deg) scale(1.05)` : isEmpty ? (rot ? `rotate(${rot}deg)` : 'none') : `rotate(${rot}deg) scale(0.97)`,
        },
      }}
    >
      {!isEmpty ? (
        <Box position="relative" width="100%" height="100%">
          <CardFaceContent
            card={{
              ...widget,
              type: 'card',
              faceUp: hasFront,
              frontContent: widget.frontContent || { type: 'text', value: '' },
              backContent: widget.backContent || { type: 'text', value: '🂠', color: '#0d47a1' },
              faceObjects: widget.faceObjects,
              backFaceObjects: widget.backFaceObjects,
              rotation: 0,
            } as unknown as CardWidget}
            isFaceUp={hasFront}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 24,
              height: 24,
              px: 0.5,
              borderRadius: '50%',
              bgcolor: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              border: '1.5px solid rgba(255, 255, 255, 0.6)',
              fontSize: '0.8rem',
              fontWeight: 800,
              boxShadow: 2,
              pointerEvents: 'none',
            }}
          >
            {count}
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
          {t('games.tabletop.empty')}
        </Typography>
      )}
    </Box>
  );
};
