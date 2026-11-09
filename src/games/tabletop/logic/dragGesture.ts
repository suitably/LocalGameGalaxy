/**
 * Drag gesture ids on actions [ID: LOGIC-TABLETOP-DRAG-GESTURE]
 *
 * The engine tags every move and the final snap of one drag with the same `gesture` id. The
 * reducer keeps the id of the last action in `TabletopGameState.gesture`, so the undo history
 * merges a whole drag into one entry, also on the host for drags sent as intents (#684).
 */
import type { TabletopAction } from './tabletopReducer';
import type { TabletopWidget } from './types';

/** Types the drag overlay draws; the board copy of such a widget is hidden while it is lifted. */
export const OVERLAY_WIDGET_TYPES: ReadonlySet<TabletopWidget['type']> = new Set([
  'card',
  'token',
  'die',
]);

/** The drag gesture an action belongs to, or undefined. */
export function gestureOf(action: TabletopAction): string | undefined {
  if (action.type !== 'MOVE_WIDGET' && action.type !== 'SNAP_TO_HOLDER') return undefined;
  return action.payload.gesture;
}
