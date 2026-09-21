/**
 * Filter functions for deciding which widgets render on the shared table canvas [ID: LOGIC-BOARD-FILTER]
 */
import type { TabletopWidget, HolderWidget } from './types';
import { isCardInHand } from './handLayout';

/**
 * Checks whether a holder is a player hand holder.
 */
export function isHandHolder(holder: HolderWidget): boolean {
  if (holder.isHand) return true;
  const idLower = (holder.id || '').toLowerCase();
  return idLower === 'hand' || idLower.includes('_hand') || idLower.includes('hand_') || idLower.includes('- hand') || idLower.endsWith('hand');
}

/**
 * Checks whether a holder is an internal player supply reserve organizer
 * (e.g. "Player 1 - Roads", "Player 2 - Settlements", "Player 1 - Cities", etc.)
 */
export function isSupplyReserveHolder(holder: HolderWidget): boolean {
  const idLower = (holder.id || '').toLowerCase();
  if (/player \d+/i.test(idLower)) {
    return (
      idLower.includes('road') ||
      idLower.includes('settlement') ||
      idLower.includes('city') ||
      idLower.includes('ship') ||
      idLower.includes('bonus') ||
      idLower.includes('reserve') ||
      idLower.includes('supply')
    );
  }
  return false;
}

/**
 * Checks whether a token is currently residing inside a player supply reserve holder
 * and has not yet been placed onto the board.
 */
export function isPieceInSupplyReserve(
  widget: TabletopWidget,
  widgets: Record<string, TabletopWidget>,
): boolean {
  if (widget.type !== 'token') return false;
  if (!widget.parent) return false;
  const parent = widgets[widget.parent];
  if (!parent || parent.type !== 'holder') return false;
  return isSupplyReserveHolder(parent as HolderWidget);
}

/**
 * Returns holders that should be rendered as background zones on the table canvas.
 * Filters out personal hand areas and supply organizers when running with dock/local mode.
 */
export function filterBoardHolders(
  widgets: Record<string, TabletopWidget>,
  visibleIds: Set<string>,
  isTvMode = false,
): HolderWidget[] {
  return Object.values(widgets)
    .filter((w): w is HolderWidget => w.type === 'holder' && visibleIds.has(w.id))
    .filter((h) => {
      if (isTvMode) return true;
      if (isHandHolder(h)) return false;
      if (isSupplyReserveHolder(h)) return false;
      return true;
    });
}

/**
 * Returns non-holder widgets that should be rendered on the table canvas.
 * Filters out cards currently in hand and unplaced reserve tokens when running with dock/local mode.
 */
export function filterBoardWidgets(
  widgets: Record<string, TabletopWidget>,
  visibleIds: Set<string>,
  isTvMode = false,
): TabletopWidget[] {
  return Object.values(widgets)
    .filter((w) => {
      if (w.type === 'holder') return false;
      if (!visibleIds.has(w.id)) return false;
      if (!isTvMode) {
        if (w.type === 'card' && isCardInHand(w.id, widgets)) return false;
        if (w.type === 'token' && isPieceInSupplyReserve(w, widgets)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}
