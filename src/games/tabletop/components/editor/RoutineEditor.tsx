/**
 * Edits a button's routine as JSON, validated before it is saved [ID: COMP-TABLETOP-ROUTINE-EDITOR]
 */
import React, { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { parseRoutine } from '../../logic/routines';
import { appendSteps } from '../../logic/routineTemplates';
import type { ButtonWidget, RoutineStep, TabletopWidget } from '../../logic/types';
import { RoutineTemplateMenu } from './RoutineTemplateMenu';
import { ConditionBuilder } from './ConditionBuilder';

interface RoutineEditorProps {
  widget: ButtonWidget;
  /** The game's widgets, for templates and the condition builder. */
  widgets: Record<string, TabletopWidget>;
  onSave: (routine: RoutineStep[]) => void;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({ widget, widgets, onSave }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(() => JSON.stringify(widget.routine, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [showCondition, setShowCondition] = useState(false);
  const insert = (steps: RoutineStep[]) => setText((current) => appendSteps(current, steps));

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
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <RoutineTemplateMenu widgets={widgets} onInsert={insert} />
        <Button size="small" onClick={() => setShowCondition((v) => !v)}>
          {t('games.tabletop.editor.condition_add')}
        </Button>
        <Button size="small" variant="outlined" onClick={save}>
          {t('games.tabletop.editor.routine_save')}
        </Button>
      </Stack>
      {showCondition && <ConditionBuilder widgets={widgets} onInsert={insert} />}
    </Stack>
  );
};
