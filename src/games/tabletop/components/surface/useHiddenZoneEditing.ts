/**
 * Owner-only drag/resize of hidden zones in edit mode [ID: GAME-TABLETOP-HIDDEN-ZONE-EDITING]
 * Keeps a live preview rect while dragging; commits once on pointer-up.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { HiddenZone } from '../../logic/types';
import { resizeZone } from '../../logic/hiddenZoneLogic';

const CANVAS_ID = 'tabletop-board-canvas';

export type ZoneCorner = 'nw' | 'ne' | 'sw' | 'se';
export type ZoneRect = { x: number; y: number; width: number; height: number };

interface Options {
  table: { width: number; height: number };
  editMode: boolean;
  currentSeatIndex?: number;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, rect: ZoneRect) => void;
}

interface Session {
  id: string;
  corner: ZoneCorner | null;
  startX: number;
  startY: number;
  origin: ZoneRect;
  scale: number;
}

export function computeZoneRect(
  table: { width: number; height: number },
  origin: ZoneRect,
  corner: ZoneCorner | null,
  dx: number,
  dy: number,
): ZoneRect {
  if (!corner) {
    const x = Math.min(Math.max(0, origin.x + dx), Math.max(0, table.width - origin.width));
    const y = Math.min(Math.max(0, origin.y + dy), Math.max(0, table.height - origin.height));
    return { ...origin, x, y };
  }
  const west = corner.includes('w');
  const north = corner.startsWith('n');
  const raw = {
    x: west ? origin.x + dx : origin.x,
    y: north ? origin.y + dy : origin.y,
    width: west ? origin.width - dx : origin.width + dx,
    height: north ? origin.height - dy : origin.height + dy,
  };
  const out = resizeZone(table, raw);
  // Anchor the opposite edge when the minimum size clamps the dragged edge.
  if (west) out.x = Math.min(out.x, origin.x + origin.width - out.width);
  if (north) out.y = Math.min(out.y, origin.y + origin.height - out.height);
  return resizeZone(table, out);
}

export function useHiddenZoneEditing({
  table,
  editMode,
  currentSeatIndex,
  onMove,
  onResize,
}: Options) {
  const [preview, setPreview] = useState<{ id: string; rect: ZoneRect } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const latest = useRef({ table, onMove, onResize });
  useEffect(() => {
    latest.current = { table, onMove, onResize };
  });

  useEffect(() => () => cleanup.current?.(), []);

  const canEdit = useCallback(
    (zone: HiddenZone) =>
      editMode && currentSeatIndex !== undefined && zone.ownerSeat === currentSeatIndex,
    [editMode, currentSeatIndex],
  );

  const begin = useCallback(
    (e: React.PointerEvent, zone: HiddenZone, corner: ZoneCorner | null) => {
      if (!canEdit(zone) || e.button > 0) return;
      e.stopPropagation();
      e.preventDefault();
      const canvas = document.getElementById(CANVAS_ID);
      const width = canvas?.offsetWidth || 0;
      const shown = canvas?.getBoundingClientRect().width || 0;
      const session: Session = {
        id: zone.id,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        origin: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
        scale: width && shown ? width / shown : 1,
      };
      const rectAt = (ev: PointerEvent) =>
        computeZoneRect(
          latest.current.table,
          session.origin,
          corner,
          (ev.clientX - session.startX) * session.scale,
          (ev.clientY - session.startY) * session.scale,
        );
      const stop = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        cleanup.current = null;
        setPreview(null);
      };
      const move = (ev: PointerEvent) => setPreview({ id: session.id, rect: rectAt(ev) });
      const up = (ev: PointerEvent) => {
        const rect = rectAt(ev);
        stop();
        const o = session.origin;
        if (rect.x === o.x && rect.y === o.y && rect.width === o.width && rect.height === o.height)
          return;
        if (corner) latest.current.onResize(session.id, rect);
        else latest.current.onMove(session.id, rect.x - o.x, rect.y - o.y);
      };
      const cancel = () => stop();
      cleanup.current?.();
      cleanup.current = stop;
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    },
    [canEdit],
  );

  /** Live rect to render for a zone (preview while dragging, stored rect otherwise). */
  const getRect = useCallback(
    (zone: HiddenZone): ZoneRect =>
      preview?.id === zone.id
        ? preview.rect
        : { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
    [preview],
  );

  return {
    canEdit,
    getRect,
    previewZoneId: preview?.id ?? null,
    onBodyPointerDown: (e: React.PointerEvent, zone: HiddenZone) => begin(e, zone, null),
    onCornerPointerDown: (e: React.PointerEvent, zone: HiddenZone, corner: ZoneCorner) =>
      begin(e, zone, corner),
  };
}
