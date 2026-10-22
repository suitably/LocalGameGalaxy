/**
 * Table surface with the in-app editor around it [ID: COMP-TABLETOP-EDITOR]
 *
 * Used on the device that owns the state (TV host or local play). Edits are normal reducer
 * actions, so they sync to phones like any other change.
 */
import React, { useState } from 'react';
import { Box } from '@mui/material';
import type { TabletopAction, TabletopGameState } from '../../logic/tabletopReducer';
import { TabletopSurface } from '../surface/TabletopSurface';
import { TableMotionStyles } from '../surface/TableMotionStyles';
import { EditorToolbar } from './EditorToolbar';
import { WidgetInspector } from './WidgetInspector';
import { TableSettingsDialog } from './TableSettingsDialog';
import { DeckBuilderDialog } from './DeckBuilderDialog';
import { useTabletopEditor } from './useTabletopEditor';
import { SelectionHandles } from './SelectionHandles';

interface TabletopEditorProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  isTvMode?: boolean;
  /** Pass and play: seat chips hidden, seats change through the handover. */
  hideSeatSelector?: boolean;
}

/** Outlines the selected widget; board widgets sit in a `display: contents` wrapper. */
const selectionCss = (id: string) => {
  const sel = `[data-widget-id="${CSS.escape(id)}"]`;
  return `${sel}[data-widget-wrapper] > *, ${sel}:not([data-widget-wrapper]) { outline: 3px solid #ffb300; outline-offset: 2px; }`;
};

export const TabletopEditor: React.FC<TabletopEditorProps> = ({
  state,
  dispatch,
  isTvMode,
  hideSeatSelector,
}) => {
  const editor = useTabletopEditor(state, dispatch);
  const [tableOpen, setTableOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);

  return (
    <>
      <TableMotionStyles />
      <Box
        sx={{ width: '100%', height: '100%' }}
        onPointerDownCapture={(e) => {
          if (!editor.editMode) return;
          const el = (e.target as Element).closest('[data-widget-id]');
          if (el) editor.setSelectedId(el.getAttribute('data-widget-id'));
        }}
      >
        <TabletopSurface
          state={state}
          dispatch={dispatch}
          isTvMode={isTvMode}
          hideSeatSelector={hideSeatSelector}
        />
      </Box>
      {editor.editMode && editor.selectedId && <style>{selectionCss(editor.selectedId)}</style>}
      {editor.editMode && editor.selected && (
        <SelectionHandles
          key={editor.selected.id}
          widget={editor.selected}
          onCommit={(p) => editor.selectedId && editor.patch(editor.selectedId, p)}
        />
      )}
      <EditorToolbar
        editor={editor}
        onOpenTableSettings={() => setTableOpen(true)}
        onOpenDeckBuilder={() => setDeckOpen(true)}
      />
      {editor.editMode && <WidgetInspector game={state.game} editor={editor} />}
      <TableSettingsDialog
        open={tableOpen}
        table={state.game.table}
        onChange={editor.updateTable}
        onClose={() => setTableOpen(false)}
      />
      <DeckBuilderDialog
        open={deckOpen}
        onClose={() => setDeckOpen(false)}
        onCreate={(draft) => {
          editor.addDeck(draft);
          setDeckOpen(false);
        }}
      />
    </>
  );
};
