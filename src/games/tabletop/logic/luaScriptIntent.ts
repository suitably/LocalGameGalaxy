/**
 * Which script intents the host applies [ID: LOGIC-TABLETOP-LUA-INTENT]
 *
 * Scripts act for the host (they deal into every hand, move any piece), but only through the
 * reducer actions the shim emits (`luaShimWrite.ts`, `luaShimButtons.ts`): the same synced
 * intents a phone sends (`isSyncedIntent`, no redacted copies, `syncProtocol.ts`) plus a narrow
 * slice of editor actions — adding, patching and deleting the script's own `lua_rt_` buttons,
 * and patching a widget's name, lock, visibility or button text. A script can never hand a
 * widget to a seat (`ownerSeat`), rewrite the table, or delete pieces.
 */
import type { TabletopAction } from './tabletopReducer';
import type { TabletopGameDefinition } from './types';
import { containsRedactedWidget, isSyncedIntent } from './syncProtocol';
import { LUA_RUNTIME_BUTTON_PREFIX, LUA_TRANSLATED_BUTTON_PREFIX } from './luaShimTypes';

const SCRIPT_ACTIONS = new Set<TabletopAction['type']>([
  'MOVE_WIDGET',
  'FLIP_CARD',
  'FLIP_WIDGETS',
  'ROTATE_CARD',
  'ROTATE_WIDGETS',
  'SHUFFLE_DECK',
  'DRAW_CARD',
  'DRAW_FROM_BAG',
  'SNAP_TO_HOLDER',
  'RETURN_CARD_TO_DECK',
  'SET_STATE',
  'NEXT_STATE',
  'ROLL_DIE',
  'UPDATE_COUNTER',
  'NEXT_TURN',
  'ADD_WIDGET',
  'PATCH_WIDGETS',
  'DELETE_WIDGETS',
]);

/** Fields a script may patch on any widget (`setName`, `setLock`, `editButton`, …). */
const PATCHABLE = new Set([
  'label',
  'pinned',
  'display',
  'text',
  'color',
  'x',
  'y',
  'width',
  'height',
]);
/** Of those, the ones that only buttons may change (position and size of a script button). */
const BUTTON_ONLY = new Set(['text', 'color', 'x', 'y', 'width', 'height']);

const isScriptButtonId = (id: string) =>
  id.startsWith(LUA_RUNTIME_BUTTON_PREFIX) || id.startsWith(LUA_TRANSLATED_BUTTON_PREFIX);

export function acceptScriptIntent(
  action: TabletopAction,
  game: Pick<TabletopGameDefinition, 'widgets'>,
): boolean {
  if (
    !isSyncedIntent(action) ||
    containsRedactedWidget(action) ||
    !SCRIPT_ACTIONS.has(action.type)
  ) {
    return false;
  }
  switch (action.type) {
    case 'ADD_WIDGET': {
      const w = action.payload.widget;
      return (
        w.type === 'button' &&
        w.id.startsWith(LUA_RUNTIME_BUTTON_PREFIX) &&
        !game.widgets[w.id] &&
        w.ownerSeat === undefined &&
        w.routine.length === 0
      );
    }
    case 'DELETE_WIDGETS':
      return action.payload.ids.every((id) => id.startsWith(LUA_RUNTIME_BUTTON_PREFIX));
    case 'PATCH_WIDGETS':
      return Object.entries(action.payload.patches).every(([id, patch]) => {
        const target = game.widgets[id];
        if (!target) return false;
        return Object.keys(patch).every(
          (key) =>
            PATCHABLE.has(key) &&
            (!BUTTON_ONLY.has(key) || (target.type === 'button' && isScriptButtonId(id))),
        );
      });
    default:
      return true;
  }
}
