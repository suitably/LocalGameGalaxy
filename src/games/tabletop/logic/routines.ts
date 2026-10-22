/**
 * Button routines: a fixed vocabulary of table actions, no code [ID: LOGIC-TABLETOP-ROUTINES]
 *
 * Routines are data (JSON) that map to ordinary reducer actions, so they are safe to share in
 * game files, sync like any other action and are undoable. Unknown ops or bad fields are
 * rejected when parsing; limits keep a routine from flooding the table or the sync channel.
 */
import type { TabletopAction } from './tabletopReducer';
import type { RoutineStep } from './types';
import type { WidgetPatch } from './widgetEdits';

export const MAX_ROUTINE_STEPS = 50;
export const MAX_DRAW_COUNT = 60;
const FORBIDDEN_PROPS = new Set(['id', 'type', 'routine']);

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isStr);

/** Validates one step; returns an error message key on failure. */
function checkStep(raw: unknown): RoutineStep | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not_object';
  const s = raw as Record<string, unknown>;
  switch (s.op) {
    case 'SHUFFLE':
      return isStr(s.deck) ? { op: 'SHUFFLE', deck: s.deck } : 'missing_field';
    case 'DRAW':
      if (!isStr(s.deck)) return 'missing_field';
      if (s.count !== undefined && (!isNum(s.count) || s.count < 1 || s.count > MAX_DRAW_COUNT))
        return 'bad_count';
      if (s.to !== undefined && !isStr(s.to)) return 'missing_field';
      return {
        op: 'DRAW',
        deck: s.deck,
        count: s.count as number | undefined,
        to: s.to as string | undefined,
      };
    case 'ROLL':
      return isStrList(s.dice) ? { op: 'ROLL', dice: s.dice } : 'missing_field';
    case 'FLIP':
      return isStrList(s.cards) ? { op: 'FLIP', cards: s.cards } : 'missing_field';
    case 'MOVE':
      return isStr(s.widget) && isNum(s.x) && isNum(s.y)
        ? { op: 'MOVE', widget: s.widget, x: s.x, y: s.y }
        : 'missing_field';
    case 'SET': {
      if (!isStr(s.widget) || !s.props || typeof s.props !== 'object' || Array.isArray(s.props))
        return 'missing_field';
      const props = s.props as Record<string, unknown>;
      if (Object.keys(props).some((k) => FORBIDDEN_PROPS.has(k))) return 'forbidden_prop';
      return { op: 'SET', widget: s.widget, props };
    }
    case 'COUNTER':
      return isStr(s.counter) && isNum(s.delta)
        ? { op: 'COUNTER', counter: s.counter, delta: s.delta }
        : 'missing_field';
    case 'TIMER':
      return isStr(s.timer) && (s.action === 'toggle' || s.action === 'reset')
        ? { op: 'TIMER', timer: s.timer, action: s.action }
        : 'missing_field';
    case 'SPIN':
      return isStr(s.spinner) ? { op: 'SPIN', spinner: s.spinner } : 'missing_field';
    case 'NEXT_STATE':
      return isStr(s.widget) ? { op: 'NEXT_STATE', widget: s.widget } : 'missing_field';
    default:
      return 'unknown_op';
  }
}

export type RoutineParseResult =
  { ok: true; routine: RoutineStep[] } | { ok: false; error: string; step?: number };

/** Parses routine JSON (an array of steps). Errors carry a message key and the 1-based step. */
export function parseRoutine(input: unknown): RoutineParseResult {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return { ok: false, error: 'invalid_json' };
    }
  }
  if (!Array.isArray(value)) return { ok: false, error: 'not_array' };
  if (value.length > MAX_ROUTINE_STEPS) return { ok: false, error: 'too_many_steps' };
  const routine: RoutineStep[] = [];
  for (let i = 0; i < value.length; i++) {
    const step = checkStep(value[i]);
    if (typeof step === 'string') return { ok: false, error: step, step: i + 1 };
    routine.push(step);
  }
  return { ok: true, routine };
}

/** Reducer actions for a routine; `now` is the click time for timers. */
export function routineToActions(routine: RoutineStep[], now: number): TabletopAction[] {
  return routine.flatMap((step): TabletopAction[] => {
    switch (step.op) {
      case 'SHUFFLE':
        return [{ type: 'SHUFFLE_DECK', payload: { deckId: step.deck } }];
      case 'DRAW':
        return Array.from({ length: Math.min(step.count ?? 1, MAX_DRAW_COUNT) }, () => ({
          type: 'DRAW_CARD' as const,
          payload: { deckId: step.deck, targetHolderId: step.to },
        }));
      case 'ROLL':
        return step.dice.map((dieId) => ({ type: 'ROLL_DIE' as const, payload: { dieId } }));
      case 'FLIP':
        return step.cards.map((cardId) => ({ type: 'FLIP_CARD' as const, payload: { cardId } }));
      case 'MOVE':
        return [{ type: 'MOVE_WIDGET', payload: { id: step.widget, x: step.x, y: step.y } }];
      case 'SET':
        return [
          {
            type: 'PATCH_WIDGETS',
            payload: { patches: { [step.widget]: step.props as WidgetPatch } },
          },
        ];
      case 'COUNTER':
        return [
          { type: 'UPDATE_COUNTER', payload: { counterId: step.counter, delta: step.delta } },
        ];
      case 'TIMER':
        return [
          step.action === 'toggle'
            ? { type: 'TOGGLE_TIMER', payload: { timerId: step.timer, now } }
            : { type: 'RESET_TIMER', payload: { timerId: step.timer } },
        ];
      case 'SPIN':
        return [{ type: 'SPIN_SPINNER', payload: { spinnerId: step.spinner } }];
      case 'NEXT_STATE':
        return [{ type: 'NEXT_STATE', payload: { widgetId: step.widget } }];
    }
  });
}
