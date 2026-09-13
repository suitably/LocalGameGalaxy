import React from 'react';
import { Box, Typography, Badge } from '@mui/material';
import type { DeckWidget } from '../../logic/types';
import { PlayingCardFace } from './PlayingCardFace';

interface DeckWidgetViewProps {
  widget: DeckWidget;
  onDraw?: () => void;
  onShuffle?: () => void;
}

export const DeckWidgetView: React.FC<DeckWidgetViewProps> = ({
  widget,
  onDraw,
  onShuffle,
}) => {
  const count = widget.cardIds?.length || 0;
  const isEmpty = count === 0;

  return (
    <Box
      onClick={!isEmpty ? onDraw : undefined}
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
        boxShadow: isEmpty
          ? 1
          : '1px 1px 0 rgba(255,255,255,0.8), 2px 2px 0 #1e3a8a, 3px 3px 0 rgba(255,255,255,0.8), 4px 4px 0 #1e3a8a, 6px 6px 14px rgba(0,0,0,0.45)',
        cursor: isEmpty ? 'default' : 'pointer',
        userSelect: 'none',
        bgcolor: isEmpty ? 'rgba(0,0,0,0.1)' : '#fff',
        border: '1.5px solid rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.1s ease',
        overflow: 'hidden',
        '&:active': {
          transform: isEmpty ? 'none' : 'scale(0.97)',
        },
      }}
    >
      {!isEmpty ? (
        <Box position="relative" width="100%" height="100%">
          <PlayingCardFace
            frontContent={{ type: 'text', value: '' }}
            backContent={widget.backContent}
            isFaceUp={false}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 6,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Badge
              badgeContent={count}
              color="primary"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.8rem', height: 20, minWidth: 20, fontWeight: 700 } }}
            />
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
          Leer
        </Typography>
      )}
    </Box>
  );
};
