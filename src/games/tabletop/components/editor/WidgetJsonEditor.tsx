/**
 * Raw JSON editing of one widget [ID: COMP-TABLETOP-WIDGET-JSON]
 */
import React, { useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { TabletopWidget } from '../../logic/types';
import { parseWidgetPatch, type WidgetPatch } from '../../logic/widgetEdits';

interface WidgetJsonEditorProps {
  widget: TabletopWidget;
  onApply: (patch: WidgetPatch) => void;
}

export const WidgetJsonEditor: React.FC<WidgetJsonEditorProps> = ({ widget, onApply }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(() => JSON.stringify(widget, null, 2));
  const [invalid, setInvalid] = useState(false);

  const apply = () => {
    const patch = parseWidgetPatch(text);
    setInvalid(!patch);
    if (patch) onApply(patch);
  };

  return (
    <Stack spacing={1}>
      <TextField
        multiline
        minRows={8}
        maxRows={20}
        value={text}
        onChange={(e) => setText(e.target.value)}
        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
      />
      {invalid && <Alert severity="error">{t('games.tabletop.editor.json_invalid')}</Alert>}
      <Button variant="outlined" size="small" onClick={apply}>
        {t('games.tabletop.editor.json_apply')}
      </Button>
    </Stack>
  );
};
