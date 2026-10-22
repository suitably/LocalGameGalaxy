/**
 * Pure editor operations on the widget map [ID: LOGIC-TABLETOP-WIDGET-EDITS]
 *
 * Used by the reducer's edit actions; every function returns a new game and leaves the input
 * untouched, so `diffGame` can turn any edit into a delta for sync and undo.
 */
import type {
  DeckWidget,
  HolderWidget,
  TabletopGameDefinition,
  TabletopTableConfig,
  TabletopWidget,
} from './types';
import { removeFromHolderAndUpdateHand } from './reducers/holderMembership';

/** Changes for one widget; `id` and `type` cannot be patched. */
export type WidgetPatch = Partial<Omit<TabletopWidget, 'id' | 'type'>>;

export function patchWidgets(
  game: TabletopGameDefinition,
  patches: Record<string, WidgetPatch>,
): TabletopGameDefinition {
  const widgets = { ...game.widgets };
  let changed = false;
  for (const [id, patch] of Object.entries(patches)) {
    const w = widgets[id];
    if (!w) continue;
    const safe = Object.fromEntries(
      Object.entries(patch).filter(([key]) => key !== 'id' && key !== 'type'),
    );
    widgets[id] = { ...w, ...safe } as TabletopWidget;
    changed = true;
  }
  return changed ? { ...game, widgets } : game;
}

/** Adds widgets; ids that already exist are left as they are. */
export function addWidgets(
  game: TabletopGameDefinition,
  added: TabletopWidget[],
): TabletopGameDefinition {
  const fresh = added.filter((w) => !game.widgets[w.id]);
  if (fresh.length === 0) return game;
  return {
    ...game,
    widgets: { ...game.widgets, ...Object.fromEntries(fresh.map((w) => [w.id, w])) },
  };
}

/** Deleting a deck also deletes its cards; deleted widgets leave their holders and decks. */
export function deleteWidgets(game: TabletopGameDefinition, ids: string[]): TabletopGameDefinition {
  const doomed = new Set<string>();
  for (const id of ids) {
    const w = game.widgets[id];
    if (!w) continue;
    doomed.add(id);
    if (w.type === 'deck') (w as DeckWidget).cardIds.forEach((c) => doomed.add(c));
  }
  if (doomed.size === 0) return game;

  const widgets = { ...game.widgets };
  for (const id of doomed) removeFromHolderAndUpdateHand(widgets, id);
  for (const id of doomed) delete widgets[id];
  for (const [wId, w] of Object.entries(widgets)) {
    if (w.type === 'deck') {
      const deck = w as DeckWidget;
      if (deck.cardIds.some((c) => doomed.has(c))) {
        const cardIds = deck.cardIds.filter((c) => !doomed.has(c));
        widgets[wId] = { ...deck, cardIds, cardCount: cardIds.length };
      }
    } else if (w.parent && doomed.has(w.parent)) {
      widgets[wId] = { ...w, parent: undefined };
    }
  }
  return { ...game, widgets };
}

/** A copy of widget `id` under `newId`, shifted by `offset`, outside any holder. */
export function cloneWidget(
  game: TabletopGameDefinition,
  id: string,
  newId: string,
  offset = 20,
): TabletopWidget | null {
  const w = game.widgets[id];
  if (!w || w.type === 'deck' || game.widgets[newId]) return null;
  const copy = { ...w, id: newId, x: w.x + offset, y: w.y + offset, parent: undefined };
  if (copy.type === 'holder') (copy as HolderWidget).childIds = [];
  return copy as TabletopWidget;
}

export function updateTable(
  game: TabletopGameDefinition,
  changes: Partial<TabletopTableConfig>,
): TabletopGameDefinition {
  return { ...game, table: { ...game.table, ...changes } };
}

/** Parses editor JSON into a patch; `null` unless it is a JSON object. */
export function parseWidgetPatch(text: string): WidgetPatch | null {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as WidgetPatch;
  } catch {
    return null;
  }
}
