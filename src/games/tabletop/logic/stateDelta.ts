/**
 * Game state deltas for host-authoritative sync [ID: LOGIC-TABLETOP-STATE-DELTA]
 *
 * The host diffs the game before and after an action and broadcasts only what changed.
 * The reducer returns new objects for changed widgets, so a reference check is enough.
 */
import type { TabletopGameDefinition, TabletopWidget } from './types';

export interface GameDelta {
  /** Changed or new widgets; `null` removes the widget. */
  widgets: Record<string, TabletopWidget | null>;
  /** Top-level fields (table, hidden zones, …) that changed, replaced as a whole. */
  fields?: Partial<Omit<TabletopGameDefinition, 'widgets'>>;
}

export function diffGame(
  prev: TabletopGameDefinition,
  next: TabletopGameDefinition,
): GameDelta | null {
  const widgets: GameDelta['widgets'] = {};
  let changed = false;

  if (prev.widgets !== next.widgets) {
    for (const [id, w] of Object.entries(next.widgets)) {
      if (prev.widgets[id] !== w) {
        widgets[id] = w;
        changed = true;
      }
    }
    for (const id of Object.keys(prev.widgets)) {
      if (!(id in next.widgets)) {
        widgets[id] = null;
        changed = true;
      }
    }
  }

  const fields: Record<string, unknown> = {};
  for (const key of Object.keys({ ...prev, ...next }) as (keyof TabletopGameDefinition)[]) {
    if (key === 'widgets' || prev[key] === next[key]) continue;
    fields[key] = next[key];
    changed = true;
  }

  if (!changed) return null;
  return Object.keys(fields).length > 0
    ? { widgets, fields: fields as GameDelta['fields'] }
    : { widgets };
}

export function applyGameDelta(
  game: TabletopGameDefinition,
  delta: GameDelta,
): TabletopGameDefinition {
  const widgets = { ...game.widgets };
  for (const [id, w] of Object.entries(delta.widgets)) {
    if (w === null) delete widgets[id];
    else widgets[id] = w;
  }
  return { ...game, ...delta.fields, widgets };
}
