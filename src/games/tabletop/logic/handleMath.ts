/**
 * Geometry for the editor's resize and rotate handles [ID: LOGIC-TABLETOP-HANDLE-MATH]
 */
export const MIN_WIDGET_SIZE = 20;
export const ROTATION_SNAP_DEG = 15;

/** New size after dragging the bottom-right handle by (`dx`, `dy`) table units. */
export function resizeBy(
  start: { width: number; height: number },
  dx: number,
  dy: number,
  keepAspect: boolean,
): { width: number; height: number } {
  let width = Math.max(MIN_WIDGET_SIZE, Math.round(start.width + dx));
  let height = Math.max(MIN_WIDGET_SIZE, Math.round(start.height + dy));
  if (keepAspect && start.width > 0 && start.height > 0) {
    const scale = Math.max(width / start.width, height / start.height);
    width = Math.max(MIN_WIDGET_SIZE, Math.round(start.width * scale));
    height = Math.max(MIN_WIDGET_SIZE, Math.round(start.height * scale));
  }
  return { width, height };
}

/** Rotation in degrees (0 = handle straight above the centre), optionally snapped. */
export function rotationFromPointer(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
  snap: boolean,
): number {
  const deg = (Math.atan2(pointer.x - center.x, center.y - pointer.y) * 180) / Math.PI;
  const normalized = ((deg % 360) + 360) % 360;
  const value = snap
    ? Math.round(normalized / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG
    : Math.round(normalized);
  return value % 360;
}
