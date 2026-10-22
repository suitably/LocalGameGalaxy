/**
 * Edits a button's routine as JSON, validated before it is saved [ID: COMP-TABLETOP-ROUTINE-EDITOR]
 */
import React, { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { parseRoutine } from '../../logic/routines';
import type { ButtonWidget, RoutineStep } from '../../logic/types';

interface RoutineEditorProps {
  widget: ButtonWidget;
  onSave: (routine: RoutineStep[]) => void;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({ widget, onSave }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(() => JSON.stringify(widget.routine, null, 2));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const result = parseRoutine(text);
    if (result.ok) {
      setError(null);
      onSave(result.routine);
    } else {
      setError(
        t(`games.tabletop.editor.routine_error_${result.error}`, { step: result.step ?? '' }),
      );
    }
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {t('games.tabletop.editor.routine_help')}
      </Typography>
      <TextField
        multiline
        minRows={4}
        maxRows={14}
        label={t('games.tabletop.editor.routine')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button size="small" variant="outlined" onClick={save}>
        {t('games.tabletop.editor.routine_save')}
      </Button>
    </Stack>
  );
};
