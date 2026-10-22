/**
 * Edit mode state: selection, undo/redo history and edit commands [ID: HOOK-TABLETOP-EDITOR]
 *
 * While edit mode is on, every change of the game is recorded so it can be undone; undo/redo
 * themselves are dispatched as synced `APPLY_EDIT_DELTA` actions and not recorded again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { generateUUID } from '../../../../lib/uuid';
import type { TabletopAction, TabletopGameState } from '../../logic/tabletopReducer';
import type { TabletopTableConfig } from '../../logic/types';
import {
  EMPTY_HISTORY,
  recordChange,
  redoStep,
  undoStep,
  type EditHistory,
} from '../../logic/editHistory';
import { cloneWidget, type WidgetPatch } from '../../logic/widgetEdits';
import { createWidget, topZIndex, type NewWidgetKind } from '../../logic/widgetTemplates';
import { buildDeck, type DeckDraft } from '../../logic/deckBuilder';

const newId = (prefix: string) => `${prefix}_${generateUUID().slice(0, 8)}`;

export function useTabletopEditor(
  state: TabletopGameState,
  dispatch: React.Dispatch<TabletopAction>,
) {
  const { game } = state;
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<EditHistory>(EMPTY_HISTORY);
  const prevGameRef = useRef(game);
  const skipRecordRef = useRef(false);

  // Record every change made while editing (except undo/redo itself).
  useEffect(() => {
    const prev = prevGameRef.current;
    prevGameRef.current = game;
    if (!editMode || prev === game) return;
    if (skipRecordRef.current) {
      skipRecordRef.current = false;
      return;
    }
    setHistory((h) => recordChange(h, prev, game));
  }, [game, editMode]);

  const selected = selectedId ? (game.widgets[selectedId] ?? null) : null;

  const undo = useCallback(() => {
    const step = undoStep(history);
    if (!step) return;
    skipRecordRef.current = true;
    setHistory(step.history);
    dispatch({ type: 'APPLY_EDIT_DELTA', payload: step.delta });
  }, [history, dispatch]);

  const redo = useCallback(() => {
    const step = redoStep(history);
    if (!step) return;
    skipRecordRef.current = true;
    setHistory(step.history);
    dispatch({ type: 'APPLY_EDIT_DELTA', payload: step.delta });
  }, [history, dispatch]);

  const patch = (id: string, changes: WidgetPatch) =>
    dispatch({ type: 'PATCH_WIDGETS', payload: { patches: { [id]: changes } } });

  const addWidget = (kind: NewWidgetKind) => {
    // Cascade new widgets so several additions do not land on top of each other.
    const offset = (Object.keys(game.widgets).length % 8) * 60;
    const widget = createWidget(
      kind,
      newId(kind),
      game.table.width / 2 + offset,
      game.table.height / 2 + offset,
      topZIndex(game),
    );
    dispatch({ type: 'ADD_WIDGET', payload: { widget } });
    setSelectedId(widget.id);
  };

  const addDeck = (draft: DeckDraft) => {
    const deckId = newId('deck');
    const widgets = buildDeck({
      deckId,
      x: Math.round(game.table.width / 2 - draft.width / 2),
      y: Math.round(game.table.height / 2 - draft.height / 2),
      zIndex: topZIndex(game),
      width: draft.width,
      height: draft.height,
      label: draft.label || undefined,
      backImage: draft.backImage || undefined,
      faces: draft.faces,
    });
    dispatch({ type: 'ADD_WIDGETS', payload: { widgets } });
    setSelectedId(deckId);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    const copy = cloneWidget(game, selectedId, newId('copy'));
    if (!copy) return;
    dispatch({ type: 'ADD_WIDGET', payload: { widget: { ...copy, zIndex: topZIndex(game) } } });
    setSelectedId(copy.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    dispatch({ type: 'DELETE_WIDGETS', payload: { ids: [selectedId] } });
    setSelectedId(null);
  };

  const nextStateSelected = () => {
    if (selectedId) dispatch({ type: 'NEXT_STATE', payload: { widgetId: selectedId } });
  };

  const updateTable = (changes: Partial<TabletopTableConfig>) =>
    dispatch({ type: 'UPDATE_TABLE', payload: { changes } });

  const toggleEditMode = () => {
    setEditMode((on) => !on);
    setSelectedId(null);
  };

  // Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Delete removes the selection.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        dispatch({ type: 'DELETE_WIDGETS', payload: { ids: [selectedId] } });
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMode, undo, redo, selectedId, dispatch]);

  return {
    editMode,
    toggleEditMode,
    selectedId,
    setSelectedId,
    selected,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    patch,
    addWidget,
    addDeck,
    duplicateSelected,
    nextStateSelected,
    deleteSelected,
    updateTable,
  };
}

export type TabletopEditorApi = ReturnType<typeof useTabletopEditor>;
