/**
 * Pure z-order logic for board widgets [ID: LOGIC-TABLETOP-ZORDER]
 *
 * Model (as in Figma/Photoshop): a widget that was just moved goes to the top; "send to back"
 * is an explicit choice that sticks until the widget is moved again. Only widgets without a
 * parent holder take part. Functions return `zIndex` changes as a map (`id -> zIndex`) that
 * holds only widgets whose value actually changes.
 */
import type { TabletopWidget } from './types';

export type ZOrderOp = 'front' | 'forward' | 'backward' | 'back';

export const Z_ORDER_OPS: readonly ZOrderOp[] = ['front', 'forward', 'backward', 'back'];

/** Above this the stack is renumbered, so z never reaches overlays such as hidden zones (4000). */
export const Z_RENUMBER_LIMIT = 1000;

type Widgets = Record<string, TabletopWidget>;

const z = (w: TabletopWidget): number => w.zIndex || 0;

/** Board widgets bottom to top (ties keep insertion order, which is the render order). */
function stack(widgets: Widgets): TabletopWidget[] {
  return Object.values(widgets)
    .filter((w) => !w.parent)
    .map((w, i) => ({ w, i }))
    .sort((a, b) => z(a.w) - z(b.w) || a.i - b.i)
    .map(({ w }) => w);
}

function overlaps(a: TabletopWidget, b: TabletopWidget): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** Renumbers the stack to 1..n in its current order; returns only the changed values. */
export function compactZ(widgets: Widgets): Record<string, number> {
  const changes: Record<string, number> = {};
  stack(widgets).forEach((w, i) => {
    if (z(w) !== i + 1) changes[w.id] = i + 1;
  });
  return changes;
}

/** zIndex that puts `id` above everything else, or `null` when it already is on top. */
export function raiseToTopZ(widgets: Widgets, id: string): number | null {
  const self = widgets[id];
  if (!self || self.parent) return null;
  const others = stack(widgets).filter((w) => w.id !== id);
  if (others.length === 0) return null;
  const top = z(others[others.length - 1]);
  return z(self) > top ? null : top + 1;
}

/** `widgets` with `id` on top; the stack is renumbered first once it grows past the limit. */
export function raiseWidget(widgets: Widgets, id: string): Widgets {
  let current = widgets;
  let target = raiseToTopZ(current, id);
  if (target === null) return widgets;
  if (target > Z_RENUMBER_LIMIT) {
    const compact = compactZ(current);
    current = { ...current };
    for (const [wid, value] of Object.entries(compact)) {
      current[wid] = { ...current[wid], zIndex: value };
    }
    target = raiseToTopZ(current, id);
    if (target === null) return current;
  }
  return { ...current, [id]: { ...current[id], zIndex: target } };
}

/** Moves one widget a step through the stack, past the next overlapping neighbour. */
function step(
  order: TabletopWidget[],
  id: string,
  dir: 1 | -1,
  skip: ReadonlySet<string>,
): TabletopWidget[] {
  const from = order.findIndex((w) => w.id === id);
  if (from < 0) return order;
  for (let i = from + dir; i >= 0 && i < order.length; i += dir) {
    if (skip.has(order[i].id) || !overlaps(order[from], order[i])) continue;
    const next = [...order];
    next.splice(from, 1);
    next.splice(i, 0, order[from]);
    return next;
  }
  return order;
}

/** Hands the sorted z values of `before` to the widgets in the order of `after`. */
function assignZ(before: TabletopWidget[], after: TabletopWidget[]): Record<string, number> {
  const slots = before.map(z).sort((a, b) => a - b);
  const changes: Record<string, number> = {};
  let prev = -Infinity;
  after.forEach((w, i) => {
    const value = Math.max(slots[i], prev + 1);
    prev = value;
    if (value !== z(w)) changes[w.id] = value;
  });
  return changes;
}

/** `front`/`back`: the selection (keeping its internal order) goes past every other widget. */
function toEdge(order: TabletopWidget[], selected: TabletopWidget[], op: 'front' | 'back') {
  const rest = order.filter((w) => !selected.includes(w));
  if (rest.length === 0) return {};
  const after = op === 'front' ? [...rest, ...selected] : [...selected, ...rest];
  if (after.every((w, i) => w === order[i])) return {};
  const first = op === 'front' ? z(rest[rest.length - 1]) + 1 : z(rest[0]) - selected.length;
  const changes: Record<string, number> = {};
  selected.forEach((w, i) => {
    if (z(w) !== first + i) changes[w.id] = first + i;
  });
  return changes;
}

/**
 * zIndex changes for applying `op` to `ids`. `forward`/`backward` pass the next overlapping
 * widget (nothing changes when none overlaps, as the order would not be visible).
 */
export function reorderWidgets(
  widgets: Widgets,
  ids: string[],
  op: ZOrderOp,
): Record<string, number> {
  const order = stack(widgets);
  const selected = order.filter((w) => ids.includes(w.id));
  if (selected.length === 0) return {};
  if (op === 'front' || op === 'back') return toEdge(order, selected, op);

  const dir = op === 'forward' ? 1 : -1;
  const sequence = dir === 1 ? [...selected].reverse() : selected;
  const skip = new Set(ids);
  let result = order;
  for (const w of sequence) result = step(result, w.id, dir, skip);
  return assignZ(order, result);
}
