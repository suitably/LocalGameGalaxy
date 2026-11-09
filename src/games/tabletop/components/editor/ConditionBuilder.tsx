/**
 * Builds one `IF` comparison and inserts it as a step [ID: COMP-TABLETOP-CONDITION-BUILDER]
 */
import React, { useState } from 'react';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { OPERAND_KINDS, ROUTINE_CMPS } from '../../logic/routineConditions';
import { ifStep } from '../../logic/routineTemplates';
import type { RoutineCmp, RoutineOperand, RoutineStep, TabletopWidget } from '../../logic/types';

type Kind = (typeof OPERAND_KINDS)[number];

/** Widget types an operand can read. */
const KIND_TYPES: Partial<Record<Kind, TabletopWidget['type'][]>> = {
  counter: ['counter'],
  die: ['die'],
  count: ['deck', 'holder', 'bag'],
  state: ['token', 'card', 'deck', 'label', 'button', 'die'],
};

interface ConditionBuilderProps {
  widgets: Record<string, TabletopWidget>;
  onInsert: (steps: RoutineStep[]) => void;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ widgets, onInsert }) => {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('counter');
  const [widget, setWidget] = useState('');
  const [cmp, setCmp] = useState<RoutineCmp>('==');
  const [right, setRight] = useState('0');

  const types = KIND_TYPES[kind];
  const candidates = types ? Object.values(widgets).filter((w) => types.includes(w.type)) : [];
  const value = Number(right);
  const left: RoutineOperand | null = !types
    ? { of: kind as 'turn' | 'caller' }
    : widget
      ? { of: kind as 'counter' | 'die' | 'count' | 'state', widget }
      : null;
  const ready = left !== null && right.trim() !== '' && Number.isFinite(value);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label={t('games.tabletop.editor.condition_left')}
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as Kind);
            setWidget('');
          }}
          sx={{ flex: 1 }}
        >
          {OPERAND_KINDS.map((k) => (
            <MenuItem key={k} value={k}>
              {t(`games.tabletop.editor.condition_of_${k}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('games.tabletop.editor.condition_cmp')}
          value={cmp}
          onChange={(e) => setCmp(e.target.value as RoutineCmp)}
          sx={{ width: 72 }}
        >
          {ROUTINE_CMPS.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="number"
          label={t('games.tabletop.editor.condition_right')}
          value={right}
          onChange={(e) => setRight(e.target.value)}
          sx={{ width: 80 }}
        />
      </Stack>
      {types && (
        <TextField
          select
          size="small"
          label={t('games.tabletop.editor.widget')}
          value={widget}
          onChange={(e) => setWidget(e.target.value)}
        >
          {candidates.map((w) => (
            <MenuItem key={w.id} value={w.id}>
              {w.label ? `${w.label} (${w.id})` : w.id}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Button
        size="small"
        disabled={!ready}
        onClick={() => left && onInsert([ifStep({ left, cmp, right: value })])}
      >
        {t('games.tabletop.editor.condition_insert')}
      </Button>
    </Stack>
  );
};
