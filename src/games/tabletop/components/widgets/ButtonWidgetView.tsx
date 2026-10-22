/**
 * Table button that runs its routine [ID: COMP-TABLETOP-BUTTON-VIEW]
 */
import React from 'react';
import { Box } from '@mui/material';
import type { ButtonWidget } from '../../logic/types';

interface ButtonWidgetViewProps {
  widget: ButtonWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onRun: () => void;
}

export const ButtonWidgetView: React.FC<ButtonWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
  onRun,
}) => (
  <Box
    role="button"
    onPointerDown={onPointerDown}
    onClick={(e) => {
      e.stopPropagation();
      onRun();
    }}
    sx={{
      position: 'absolute',
      left: widget.x,
      top: widget.y,
      width: widget.width,
      height: widget.height,
      zIndex: widget.zIndex + (isDragging ? 100 : 0),
      bgcolor: widget.color || 'primary.main',
      color: 'common.white',
      borderRadius: 2,
      boxShadow: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontWeight: 700,
      fontSize: Math.max(12, Math.min(widget.height / 2.5, 24)),
      px: 1,
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'transform 0.1s',
      '&:active': { transform: 'scale(0.96)' },
    }}
  >
    {widget.text}
  </Box>
);
