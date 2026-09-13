import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import type { HolderWidget } from '../../logic/types';

interface HolderWidgetViewProps {
  widget: HolderWidget;
  isHovered?: boolean;
}

export const HolderWidgetView: React.FC<HolderWidgetViewProps> = ({
  widget,
  isHovered,
}) => {
  const isHand = Boolean(widget.isHand);
  const childCount = widget.childIds?.length || 0;
  const isCheckerboard =
    widget.id === 'board' ||
    widget.label?.toLowerCase().includes('schachbrett') ||
    widget.label?.toLowerCase().includes('checker');

  return (
    <Box
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex,
        borderRadius: 2.5,
        border: isCheckerboard ? '8px solid #3e2723' : '2px dashed',
        borderColor: isHovered
          ? 'primary.main'
          : isCheckerboard
          ? '#3e2723'
          : isHand
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(255, 255, 255, 0.4)',
        bgcolor: isHovered
          ? 'rgba(25, 118, 210, 0.15)'
          : isCheckerboard
          ? '#5d4037'
          : isHand
          ? 'rgba(0, 0, 0, 0.25)'
          : 'rgba(0, 0, 0, 0.15)',
        boxShadow: isCheckerboard ? '0 12px 28px rgba(0,0,0,0.6)' : 'none',
        p: isCheckerboard ? 0 : 1,
        display: isCheckerboard ? 'grid' : 'flex',
        gridTemplateColumns: isCheckerboard ? 'repeat(8, 1fr)' : undefined,
        gridTemplateRows: isCheckerboard ? 'repeat(8, 1fr)' : undefined,
        flexDirection: isCheckerboard ? undefined : 'column',
        alignItems: isCheckerboard ? undefined : 'center',
        justifyContent: isCheckerboard ? undefined : 'space-between',
        userSelect: 'none',
        pointerEvents: 'none',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {isCheckerboard ? (
        Array.from({ length: 64 }).map((_, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const isDark = (row + col) % 2 === 1;
          return (
            <Box
              key={idx}
              sx={{
                bgcolor: isDark ? '#4e342e' : '#d7ccc8',
                border: '0.5px solid rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                p: 0.3,
              }}
            >
              {col === 0 && (
                <Typography sx={{ fontSize: '0.65rem', color: isDark ? '#d7ccc8' : '#4e342e', fontWeight: 700, lineHeight: 1 }}>
                  {8 - row}
                </Typography>
              )}
            </Box>
          );
        })
      ) : (
        <>
          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ color: 'rgba(255, 255, 255, 0.85)', letterSpacing: 0.5 }}
            >
              {widget.label || (isHand ? 'Hand' : 'Ablage')}
            </Typography>

            {isHand && (
              <Chip
                size="small"
                label={`${childCount} Karten`}
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                }}
              />
            )}
          </Box>

          {/* If it is a hand on the shared TV board, display concealed card backs */}
          {isHand && childCount > 0 && (
            <Box display="flex" gap={-1.5} alignItems="center" justifyContent="center" height="70%">
              {Array.from({ length: Math.min(childCount, 8) }).map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 38,
                    height: 56,
                    borderRadius: 1,
                    bgcolor: '#0d47a1',
                    border: '1.5px solid rgba(255,255,255,0.6)',
                    boxShadow: 2,
                    transform: `rotate(${(idx - Math.min(childCount, 8) / 2) * 5}deg)`,
                    ml: idx > 0 ? -2.5 : 0,
                  }}
                />
              ))}
            </Box>
          )}

          {!isHand && childCount === 0 && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              Hier ablegen
            </Typography>
          )}
        </>
      )}
    </Box>
  );
};
