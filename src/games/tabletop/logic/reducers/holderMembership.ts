/**
 * Removing a widget from the holder that contains it [ID: LOGIC-TABLETOP-HOLDER-MEMBERSHIP]
 */
import type { HolderWidget, TabletopWidget } from '../types';
import { applyLayout, layoutHand } from '../holderLayout';
import { isHandHolder } from '../handHolder';

/** Drops `childId` from every holder (mutates the map); hands re-lay their remaining cards. */
export function removeFromHolderAndUpdateHand(
  widgets: Record<string, TabletopWidget>,
  childId: string,
) {
  for (const [wId, w] of Object.entries(widgets)) {
    if (w.type !== 'holder') continue;
    const h = w as HolderWidget;
    if (!h.childIds?.includes(childId)) continue;
    const updatedH = { ...h, childIds: h.childIds.filter((id) => id !== childId) };
    widgets[wId] = updatedH;
    if (isHandHolder(updatedH)) {
      applyLayout(widgets, layoutHand(updatedH, updatedH.childIds, widgets));
    }
  }
}
