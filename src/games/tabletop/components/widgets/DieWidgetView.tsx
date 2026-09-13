import React, { useState } from 'react';
import { Box } from '@mui/material';
import type { DieWidget } from '../../logic/types';

interface DieWidgetViewProps {
  widget: DieWidget;
  onRoll?: () => void;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const DieWidgetView: React.FC<DieWidgetViewProps> = ({
  widget,
  onRoll,
  isDragging,
  onPointerDown,
}) => {
  const [rolling, setRolling] = useState(false);
  const val = Math.min(6, Math.max(1, widget.currentValue || 1));
  const dieColor = widget.color || '#ffffff';
  const pipColor = widget.pipColor || '#dc2626';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRolling(true);
    setTimeout(() => setRolling(false), 400);
    onRoll?.();
  };

  const PIP_PATTERNS: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };

  const activePips = PIP_PATTERNS[val] || PIP_PATTERNS[1];

  return (
    <Box
      onPointerDown={onPointerDown}
      onClick={handleClick}
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        zIndex: widget.zIndex + (isDragging ? 100 : 0),
        bgcolor: dieColor,
        borderRadius: 2,
        boxShadow: isDragging ? 8 : 4,
        border: '1.5px solid rgba(0,0,0,0.15)',
        cursor: 'pointer',
        userSelect: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        p: 0.8,
        boxSizing: 'border-box',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: rolling ? 'rotate(360deg) scale(1.2)' : (isDragging ? 'scale(1.1)' : 'none'),
        '&:hover': {
          boxShadow: 6,
        },
      }}
    >
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => {
          const isPip = activePips.some(([pr, pc]) => pr === r && pc === c);
          return (
            <Box key={`${r}-${c}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPip && (
                <Box
                  sx={{
                    width: Math.max(6, widget.width / 5.5),
                    height: Math.max(6, widget.height / 5.5),
                    borderRadius: '50%',
                    bgcolor: pipColor,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
                  }}
                />
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
};
