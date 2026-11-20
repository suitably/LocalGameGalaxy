/**
 * Pure pan and zoom maths for the table view [ID: LOGIC-TABLETOP-VIEW-TRANSFORM]
 *
 * The view maps a board point `b` to the container point `b * scale + (x, y)`. Every zoom keeps
 * one container point (cursor, pinch centre, screen centre) on the same board point.
 */
export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ViewPoint {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

export const clampZoom = (scale: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));

/** Zooms to `scale` so that the board point under `anchor` (container px) stays under it. */
export function zoomAt(view: ViewTransform, anchor: ViewPoint, scale: number): ViewTransform {
  const next = clampZoom(scale);
  const ratio = next / view.scale;
  return {
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
    scale: next,
  };
}

export function panBy(view: ViewTransform, from: ViewPoint, to: ViewPoint): ViewTransform {
  return { ...view, x: view.x + (to.x - from.x), y: view.y + (to.y - from.y) };
}

const midpoint = (a: ViewPoint, b: ViewPoint): ViewPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const distance = (a: ViewPoint, b: ViewPoint): number => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Two-finger gesture: `base` is the view when the fingers were at `startA`/`startB`. The board
 * point between the fingers follows their midpoint, and the scale follows their distance.
 */
export function pinchView(
  base: ViewTransform,
  startA: ViewPoint,
  startB: ViewPoint,
  a: ViewPoint,
  b: ViewPoint,
): ViewTransform {
  const startDist = distance(startA, startB);
  const ratio = startDist > 0 ? distance(a, b) / startDist : 1;
  const zoomed = zoomAt(base, midpoint(startA, startB), base.scale * ratio);
  return panBy(zoomed, midpoint(startA, startB), midpoint(a, b));
}

/** Zoom factor for a wheel step; a pinch on a trackpad arrives as a wheel event with ctrlKey. */
export function wheelZoomFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
  const limited = Math.max(-200, Math.min(200, pixels));
  return Math.exp(-limited * (ctrlKey ? 0.01 : 0.0015));
}
