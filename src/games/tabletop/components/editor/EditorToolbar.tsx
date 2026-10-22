/**
 * Edit-mode switch, undo/redo, add-widget menu and table settings [ID: COMP-TABLETOP-EDITOR-TOOLBAR]
 */
import React, { useState } from 'react';
import { Divider, IconButton, Menu, MenuItem, Paper, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/Done';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AddBoxIcon from '@mui/icons-material/AddBox';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import { useTranslation } from 'react-i18next';
import { NEW_WIDGET_KINDS } from '../../logic/widgetTemplates';
import type { TabletopEditorApi } from './useTabletopEditor';

interface EditorToolbarProps {
  editor: TabletopEditorApi;
  onOpenTableSettings: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onOpenTableSettings }) => {
  const { t } = useTranslation();
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);

  return (
    <Paper
      elevation={4}
      sx={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        px: 0.5,
        borderRadius: 6,
      }}
    >
      <Tooltip
        title={editor.editMode ? t('games.tabletop.editor.done') : t('games.tabletop.editor.edit')}
      >
        <IconButton onClick={editor.toggleEditMode} color={editor.editMode ? 'primary' : 'default'}>
          {editor.editMode ? <DoneIcon /> : <EditIcon />}
        </IconButton>
      </Tooltip>
      {editor.editMode && (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title={t('games.tabletop.editor.undo')}>
            <span>
              <IconButton onClick={editor.undo} disabled={!editor.canUndo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('games.tabletop.editor.redo')}>
            <span>
              <IconButton onClick={editor.redo} disabled={!editor.canRedo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('games.tabletop.editor.add')}>
            <IconButton onClick={(e) => setAddAnchor(e.currentTarget)}>
              <AddBoxIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('games.tabletop.editor.table')}>
            <IconButton onClick={onOpenTableSettings}>
              <TableRestaurantIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
      <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
        {NEW_WIDGET_KINDS.map((kind) => (
          <MenuItem
            key={kind}
            onClick={() => {
              editor.addWidget(kind);
              setAddAnchor(null);
            }}
          >
            {t(`games.tabletop.editor.kind_${kind}`)}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};
