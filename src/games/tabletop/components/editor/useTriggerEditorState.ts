/**
 * State of the trigger list being edited for one button [ID: HOOK-TABLETOP-TRIGGER-EDITOR]
 */
import { useState } from 'react';
import { makeTrigger, triggerTarget } from '../../logic/routineTemplates';
import { MAX_TRIGGERS } from '../../logic/routines';
import type { RoutineTrigger } from '../../logic/types';

export interface TriggerRow {
  on: RoutineTrigger['on'];
  target: string;
}

export function useTriggerEditorState(initial: RoutineTrigger[] | undefined) {
  const [rows, setRows] = useState<TriggerRow[]>(() =>
    (initial ?? []).map((t) => ({ on: t.on, target: triggerTarget(t) })),
  );
  const update = (i: number, row: Partial<TriggerRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...row } : r)));
  const add = () =>
    setRows((prev) =>
      prev.length >= MAX_TRIGGERS ? prev : [...prev, { on: 'onTurnStart', target: '' }],
    );
  const remove = (i: number) => setRows((prev) => prev.filter((_, j) => j !== i));
  const triggers = rows.map((r) => makeTrigger(r.on, r.target));
  /** The triggers to save, or null while a row has no target. */
  const complete = triggers.every((t): t is RoutineTrigger => t !== null) ? triggers : null;
  return { rows, update, add, remove, complete, canAdd: rows.length < MAX_TRIGGERS };
}
