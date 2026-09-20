/**
 * Viewport culling hook — only returns widget IDs visible in the current viewport.
 * Essential for games with many widgets (e.g. 794 widgets in Frontiers).
 * [ID: HOOK-TABLETOP-CULLING]
 */
import { useMemo } from 'react';
import type { TabletopWidget } from '../logic/types';
import type { TransformState } from './useTabletopEngine';

const CULL_MARGIN_PX = 200; // Puffer: 200px über Viewport-Rand hinaus rendern

export function useViewportCulling(
  widgets: Record<string, TabletopWidget>,
  transform: TransformState,
  containerWidth: number,
  containerHeight: number,
): Set<string> {
  return useMemo(() => {
    const visible = new Set<string>();
    if (containerWidth <= 0 || containerHeight <= 0) {
      // Kein Container-Size bekannt → alles sichtbar (Fallback)
      Object.keys(widgets).forEach((id) => visible.add(id));
      return visible;
    }

    const { x: panX, y: panY, scale } = transform;

    for (const [id, widget] of Object.entries(widgets)) {
      const screenLeft = widget.x * scale + panX;
      const screenTop = widget.y * scale + panY;
      const screenRight = screenLeft + widget.width * scale;
      const screenBottom = screenTop + widget.height * scale;

      if (
        screenRight >= -CULL_MARGIN_PX &&
        screenLeft <= containerWidth + CULL_MARGIN_PX &&
        screenBottom >= -CULL_MARGIN_PX &&
        screenTop <= containerHeight + CULL_MARGIN_PX
      ) {
        visible.add(id);
      }
    }

    return visible;
  }, [widgets, transform, containerWidth, containerHeight]);
}
