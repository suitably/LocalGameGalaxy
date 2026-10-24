/**
 * Side panel to pick a widget and edit its properties [ID: COMP-TABLETOP-WIDGET-INSPECTOR]
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import DataObjectIcon from '@mui/icons-material/DataObjectRounded';
import LayersIcon from '@mui/icons-material/LayersRounded';
import { useTranslation } from 'react-i18next';
import type { TabletopGameDefinition } from '../../logic/types';
import { InspectorFields } from './InspectorFields';
import { WidgetJsonEditor } from './WidgetJsonEditor';
import type { TabletopEditorApi } from './useTabletopEditor';

interface WidgetInspectorProps {
  game: TabletopGameDefinition;
  editor: TabletopEditorApi;
}

export const WidgetInspector: React.FC<WidgetInspectorProps> = ({ game, editor }) => {
  const { t } = useTranslation();
  const [showJson, setShowJson] = useState(false);
  const { selected } = editor;

  const options = useMemo(
    () =>
      Object.values(game.widgets)
        .filter((w) => !(w.type === 'card' && w.inPile))
        .map((w) => ({ id: w.id, name: `${w.label || w.id} (${w.type})` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [game.widgets],
  );

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'absolute',
        top: 72,
        right: 12,
        bottom: 12,
        width: { xs: 'calc(100% - 24px)', sm: 320 },
        zIndex: 1100,
        p: 2,
        overflowY: 'auto',
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        {t('games.tabletop.editor.inspector')}
      </Typography>
      <TextField
        select
        fullWidth
        size="small"
        label={t('games.tabletop.editor.widget')}
        value={selected?.id ?? ''}
        onChange={(e) => editor.setSelectedId(e.target.value || null)}
        sx={{ mb: 2 }}
      >
        <MenuItem value="">{t('games.tabletop.editor.none')}</MenuItem>
        {options.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            {o.name}
          </MenuItem>
        ))}
      </TextField>

      {selected ? (
        <>
          <InspectorFields widget={selected} onPatch={(p) => editor.patch(selected.id, p)} />
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={editor.duplicateSelected}>
              {t('games.tabletop.editor.duplicate')}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={editor.deleteSelected}
            >
              {t('games.tabletop.editor.delete')}
            </Button>
            {(selected.states?.length ?? 0) > 1 && (
              <Button size="small" startIcon={<LayersIcon />} onClick={editor.nextStateSelected}>
                {t('games.tabletop.editor.next_state', {
                  current: (selected.stateIndex ?? 0) + 1,
                  total: selected.states?.length,
                })}
              </Button>
            )}
            <Button
              size="small"
              startIcon={<DataObjectIcon />}
              onClick={() => setShowJson((v) => !v)}
            >
              {t('games.tabletop.editor.json')}
            </Button>
          </Stack>
          <Collapse in={showJson} unmountOnExit>
            <Box sx={{ mt: 1.5 }}>
              <WidgetJsonEditor
                key={selected.id}
                widget={selected}
                onApply={(p) => editor.patch(selected.id, p)}
              />
            </Box>
          </Collapse>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('games.tabletop.editor.select_hint')}
        </Typography>
      )}
    </Paper>
  );
};
