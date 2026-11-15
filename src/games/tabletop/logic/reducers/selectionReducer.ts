/**
 * Batched move, flip and rotate of a selection [ID: LOGIC-TABLETOP-SELECTION-REDUCER]
 *
 * One action changes every selected widget at once, so the host sends one delta and the edit
 * history records one undo step (#701). Phones may send these actions; `intentAuthorization.ts`
 * rejects the whole batch when it names a widget in another seat's hand. Deleting a selection is
 * the host-only `DELETE_WIDGETS`.
 */
import { isWidgetLocked } from '../hiddenZoneLogic';
import type { TabletopAction, TabletopGameState } from '../tabletopReducer';
import type { CardWidget, TabletopWidget } from '../types';

export type SelectionAction = Extract<
  TabletopAction,
  { type: 'MOVE_WIDGETS' | 'FLIP_WIDGETS' | 'ROTATE_WIDGETS' }
>;

type Widgets = Record<string, TabletopWidget>;

/** Widgets that stand on the table by themselves and are not pinned. */
function movableOnTable(widgets: Widgets, ids: string[]): TabletopWidget[] {
  const seen = new Set<string>();
  const result: TabletopWidget[] = [];
  for (const id of ids) {
    const w = widgets[id];
    if (!w || seen.has(id) || isWidgetLocked(w) || w.parent) continue;
    if (w.type === 'card' && (w as CardWidget).inPile) continue;
    seen.add(id);
    result.push(w);
  }
  return result;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * The offset the whole group moves by: the requested one, shortened so no member leaves the
 * table. Every member moves by the same amount, so the group keeps its shape.
 */
export function groupOffset(
  members: Pick<TabletopWidget, 'x' | 'y' | 'width' | 'height'>[],
  table: { width: number; height: number },
  dx: number,
  dy: number,
): { dx: number; dy: number } {
  if (members.length === 0) return { dx: 0, dy: 0 };
  const minX = Math.min(...members.map((m) => m.x));
  const minY = Math.min(...members.map((m) => m.y));
  const maxX = Math.max(...members.map((m) => m.x + m.width));
  const maxY = Math.max(...members.map((m) => m.y + m.height));
  return {
    dx: clamp(dx, -minX, Math.max(-minX, table.width - maxX)),
    dy: clamp(dy, -minY, Math.max(-minY, table.height - maxY)),
  };
}

export function selectionReducer(
  state: TabletopGameState,
  action: SelectionAction,
): TabletopGameState {
  const { widgets, table } = state.game;
  const next: Widgets = { ...widgets };
  let changed = false;
  const set = (w: TabletopWidget) => {
    next[w.id] = w;
    changed = true;
  };

  switch (action.type) {
    case 'MOVE_WIDGETS': {
      const members = movableOnTable(widgets, action.payload.ids);
      const { dx, dy } = groupOffset(members, table, action.payload.dx, action.payload.dy);
      if (dx === 0 && dy === 0) return state;
      for (const w of members) set({ ...w, x: w.x + dx, y: w.y + dy });
      break;
    }
    case 'FLIP_WIDGETS': {
      const cards = action.payload.ids
        .map((id) => widgets[id])
        .filter((w): w is CardWidget => w?.type === 'card');
      // One side for the whole selection: all face up unless every card already is.
      const faceUp = cards.some((c) => !c.faceUp);
      for (const c of cards) {
        if (Boolean(c.faceUp) !== faceUp) set({ ...c, faceUp, activeFace: faceUp ? 1 : 0 });
      }
      break;
    }
    case 'ROTATE_WIDGETS': {
      const { ids, deltaDegrees } = action.payload;
      if (deltaDegrees % 360 === 0) return state;
      for (const id of new Set(ids)) {
        const w = widgets[id];
        if (!w || (w.type !== 'card' && w.type !== 'token' && w.type !== 'holder')) continue;
        const current = typeof w.rotation === 'number' ? w.rotation : 0;
        set({ ...w, rotation: (current + deltaDegrees) % 360 });
      }
      break;
    }
  }
  return changed ? { ...state, game: { ...state.game, widgets: next } } : state;
}
