/**
 * Resize and rotate handles on the selected widget [ID: COMP-TABLETOP-SELECTION-HANDLES]
 *
 * Rendered into the table canvas (portal), so they share its pan/zoom transform. The change is
 * previewed locally while dragging and committed as one `PATCH_WIDGETS` on release, which keeps
 * undo to one step and sync traffic to one delta.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';
import type { TabletopWidget } from '../../logic/types';
import type { WidgetPatch } from '../../logic/widgetEdits';
import { resizeBy, rotationFromPointer } from '../../logic/handleMath';

interface SelectionHandlesProps {
  widget: TabletopWidget;
  onCommit: (patch: WidgetPatch) => void;
}

type Preview = { width: number; height: number; rotation: number };

const CANVAS_ID = 'tabletop-board-canvas';
const HANDLE = 16;

const rotationOf = (w: TabletopWidget) =>
  'rotation' in w && typeof w.rotation === 'number' ? w.rotation : 0;

export const SelectionHandles: React.FC<SelectionHandlesProps> = ({ widget, onCommit }) => {
  // The surface is mounted before edit mode can select anything, so the canvas exists here.
  const [canvas] = useState(() => document.getElementById(CANVAS_ID));
  const [preview, setPreview] = useState<Preview | null>(null);

  if (!canvas) return null;
  const tableWidth = canvas.offsetWidth || 1;
  const view = preview ?? {
    width: widget.width,
    height: widget.height,
    rotation: rotationOf(widget),
  };

  /** Table units per screen pixel for the current zoom. */
  const unitsPerPx = () => tableWidth / (canvas.getBoundingClientRect().width || tableWidth);

  const startDrag = (e: React.PointerEvent, kind: 'resize' | 'rotate') => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const scale = unitsPerPx();
    const rect = canvas.getBoundingClientRect();
    const center = {
      x: rect.left + (widget.x + widget.width / 2) / scale,
      y: rect.top + (widget.y + widget.height / 2) / scale,
    };
    let latest: Preview = view;

    const onMove = (ev: PointerEvent) => {
      latest =
        kind === 'resize'
          ? {
              ...view,
              ...resizeBy(
                widget,
                (ev.clientX - startX) * scale,
                (ev.clientY - startY) * scale,
                ev.shiftKey,
              ),
            }
          : {
              ...view,
              rotation: rotationFromPointer(center, { x: ev.clientX, y: ev.clientY }, !ev.altKey),
            };
      setPreview(latest);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPreview(null);
      onCommit(
        kind === 'resize'
          ? { width: latest.width, height: latest.height }
          : ({ rotation: latest.rotation } as WidgetPatch),
      );
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleSx = {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    bgcolor: '#ffb300',
    border: '2px solid #fff',
    boxShadow: 2,
    pointerEvents: 'auto',
    touchAction: 'none',
  } as const;

  return createPortal(
    <Box
      sx={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: view.width,
        height: view.height,
        transform: `rotate(${view.rotation}deg)`,
        outline: preview ? '2px dashed #ffb300' : 'none',
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    >
      <Box
        onPointerDown={(e) => startDrag(e, 'resize')}
        sx={{
          ...handleSx,
          right: -HANDLE / 2,
          bottom: -HANDLE / 2,
          cursor: 'nwse-resize',
          borderRadius: 1,
        }}
      />
      <Box
        onPointerDown={(e) => startDrag(e, 'rotate')}
        sx={{
          ...handleSx,
          left: '50%',
          top: -HANDLE * 2.5,
          ml: `${-HANDLE / 2}px`,
          cursor: 'grab',
          borderRadius: '50%',
        }}
      />
    </Box>,
    canvas,
  );
};
