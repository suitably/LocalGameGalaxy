/**
 * Free text on the table [ID: COMP-TABLETOP-LABEL-VIEW]
 */
import React from 'react';
import { Box } from '@mui/material';
import type { LabelWidget } from '../../logic/types';

interface LabelWidgetViewProps {
  widget: LabelWidget;
  isDragging?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export const LabelWidgetView: React.FC<LabelWidgetViewProps> = ({
  widget,
  isDragging,
  onPointerDown,
}) => (
  <Box
    onPointerDown={onPointerDown}
    sx={{
      position: 'absolute',
      left: widget.x,
      top: widget.y,
      width: widget.width,
      height: widget.height,
      zIndex: widget.zIndex + (isDragging ? 100 : 0),
      color: widget.color || 'common.white',
      fontSize: widget.fontSize || 24,
      fontWeight: 700,
      lineHeight: 1.2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      whiteSpace: 'pre-wrap',
      overflow: 'hidden',
      textShadow: '0 1px 3px rgba(0,0,0,0.7)',
      userSelect: 'none',
      cursor: widget.pinned ? 'default' : 'grab',
    }}
  >
    {widget.text}
  </Box>
);
