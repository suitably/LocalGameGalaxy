import React from 'react';
import { Box, Typography, Badge } from '@mui/material';
import StyleIcon from '@mui/icons-material/Style';
import type { DeckWidget } from '../../logic/types';

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
        boxShadow: isEmpty ? 1 : 5,
        cursor: isEmpty ? 'default' : 'pointer',
        userSelect: 'none',
        bgcolor: isEmpty ? 'rgba(0,0,0,0.1)' : (widget.backContent?.color || '#0d47a1'),
        border: '2px solid',
        borderColor: isEmpty ? 'divider' : 'rgba(255,255,255,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
        transition: 'transform 0.1s ease',
        '&:active': {
          transform: isEmpty ? 'none' : 'scale(0.97)',
        },
      }}
    >
      <Badge
        badgeContent={count}
        color={isEmpty ? 'default' : 'primary'}
        sx={{ '& .MuiBadge-badge': { fontSize: '0.85rem', height: 22, minWidth: 22 } }}
      >
        <StyleIcon sx={{ fontSize: 36, color: isEmpty ? 'text.disabled' : '#fff' }} />
      </Badge>
      <Typography
        variant="caption"
        sx={{ color: isEmpty ? 'text.disabled' : '#fff', fontWeight: 600, mt: 0.5, textAlign: 'center' }}
      >
        {widget.label || 'Ziehstapel'}
      </Typography>
    </Box>
  );
};
