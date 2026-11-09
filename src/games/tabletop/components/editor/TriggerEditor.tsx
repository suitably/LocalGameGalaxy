/**
 * Picks when a button's routine runs by itself [ID: COMP-TABLETOP-TRIGGER-EDITOR]
 */
import React from 'react';
import { Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteRounded';
import { useTranslation } from 'react-i18next';
import { TRIGGER_EVENTS, triggerTargets } from '../../logic/routineTemplates';
import type { ButtonWidget, RoutineTrigger, TabletopGameDefinition } from '../../logic/types';
import { useTriggerEditorState } from './useTriggerEditorState';

interface TriggerEditorProps {
  widget: ButtonWidget;
  game: Pick<TabletopGameDefinition, 'widgets' | 'hiddenZones'>;
  onSave: (triggers: RoutineTrigger[] | undefined) => void;
}

export const TriggerEditor: React.FC<TriggerEditorProps> = ({ widget, game, onSave }) => {
  const { t } = useTranslation();
  const { rows, update, add, remove, complete, canAdd } = useTriggerEditorState(widget.triggers);

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {t('games.tabletop.editor.triggers_help')}
      </Typography>
      {rows.map((row, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label={t('games.tabletop.editor.trigger_event')}
            value={row.on}
            onChange={(e) => update(i, { on: e.target.value as RoutineTrigger['on'], target: '' })}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {TRIGGER_EVENTS.map((on) => (
              <MenuItem key={on} value={on}>
                {t(`games.tabletop.editor.trigger_${on}`)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('games.tabletop.editor.trigger_target')}
            value={row.target}
            onChange={(e) => update(i, { target: e.target.value })}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {triggerTargets(row.on, game).map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.value === '' ? t('games.tabletop.editor.trigger_any_seat') : o.label}
              </MenuItem>
            ))}
          </TextField>
          <IconButton
            size="small"
            aria-label={t('games.tabletop.editor.trigger_remove')}
            onClick={() => remove(i)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Stack direction="row" spacing={1}>
        <Button size="small" disabled={!canAdd} onClick={add}>
          {t('games.tabletop.editor.trigger_add')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={!complete}
          onClick={() => complete && onSave(complete.length > 0 ? complete : undefined)}
        >
          {t('games.tabletop.editor.triggers_save')}
        </Button>
      </Stack>
    </Stack>
  );
};
