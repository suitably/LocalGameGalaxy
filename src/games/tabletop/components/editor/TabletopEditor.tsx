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
import { EditorToolbar } from './EditorToolbar';
import { WidgetInspector } from './WidgetInspector';
import { TableSettingsDialog } from './TableSettingsDialog';
import { useTabletopEditor } from './useTabletopEditor';

interface TabletopEditorProps {
  state: TabletopGameState;
  dispatch: React.Dispatch<TabletopAction>;
  isTvMode?: boolean;
}

/** Outlines the selected widget; board widgets sit in a `display: contents` wrapper. */
const selectionCss = (id: string) => {
  const sel = `[data-widget-id="${CSS.escape(id)}"]`;
  return `${sel}[data-widget-wrapper] > *, ${sel}:not([data-widget-wrapper]) { outline: 3px solid #ffb300; outline-offset: 2px; }`;
};

export const TabletopEditor: React.FC<TabletopEditorProps> = ({ state, dispatch, isTvMode }) => {
  const editor = useTabletopEditor(state, dispatch);
  const [tableOpen, setTableOpen] = useState(false);

  return (
    <>
      <Box
        sx={{ width: '100%', height: '100%' }}
        onPointerDownCapture={(e) => {
          if (!editor.editMode) return;
          const el = (e.target as Element).closest('[data-widget-id]');
          if (el) editor.setSelectedId(el.getAttribute('data-widget-id'));
        }}
      >
        <TabletopSurface state={state} dispatch={dispatch} isTvMode={isTvMode} />
      </Box>
      {editor.editMode && editor.selectedId && <style>{selectionCss(editor.selectedId)}</style>}
      <EditorToolbar editor={editor} onOpenTableSettings={() => setTableOpen(true)} />
      {editor.editMode && <WidgetInspector game={state.game} editor={editor} />}
      <TableSettingsDialog
        open={tableOpen}
        table={state.game.table}
        onChange={editor.updateTable}
        onClose={() => setTableOpen(false)}
      />
    </>
  );
};
