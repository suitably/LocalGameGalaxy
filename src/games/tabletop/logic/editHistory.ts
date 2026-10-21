/**
 * Undo/redo for table edits, built on game deltas [ID: LOGIC-TABLETOP-EDIT-HISTORY]
 *
 * Each entry keeps the forward delta and its inverse (`diffGame(after, before)`), so undo and
 * redo are plain `APPLY_EDIT_DELTA` actions that sync like any other change.
 */
import { diffGame, type GameDelta } from './stateDelta';
import type { TabletopGameDefinition } from './types';

export interface HistoryEntry {
  forward: GameDelta;
  inverse: GameDelta;
}

export interface EditHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export const EMPTY_HISTORY: EditHistory = { past: [], future: [] };
export const HISTORY_LIMIT = 100;

/** Adds the change from `before` to `after`; a new change clears the redo stack. */
export function recordChange(
  history: EditHistory,
  before: TabletopGameDefinition,
  after: TabletopGameDefinition,
  limit = HISTORY_LIMIT,
): EditHistory {
  const forward = diffGame(before, after);
  const inverse = diffGame(after, before);
  if (!forward || !inverse) return history;
  return { past: [...history.past, { forward, inverse }].slice(-limit), future: [] };
}

/** The delta that undoes the last change, and the history after it; `null` if nothing to undo. */
export function undoStep(history: EditHistory): { delta: GameDelta; history: EditHistory } | null {
  const entry = history.past.at(-1);
  if (!entry) return null;
  return {
    delta: entry.inverse,
    history: { past: history.past.slice(0, -1), future: [entry, ...history.future] },
  };
}

export function redoStep(history: EditHistory): { delta: GameDelta; history: EditHistory } | null {
  const [entry, ...future] = history.future;
  if (!entry) return null;
  return { delta: entry.forward, history: { past: [...history.past, entry], future } };
}
