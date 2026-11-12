/**
 * Button routines: a fixed vocabulary of table actions, no code [ID: LOGIC-TABLETOP-ROUTINES]
 *
 * Routines are data (JSON) that run as ordinary reducer actions (`routineRunner.ts`), so they are
 * safe to share in game files, sync like any other action and are undoable. Unknown ops or bad
 * fields are rejected when parsing; limits keep a routine from flooding the table or the sync
 * channel. Triggers (`triggers` on a button) are validated here too.
 */
import type { RoutineSeatRef, RoutineStep, RoutineTrigger } from './types';
import { parseCondition } from './routineConditions';

/** Steps in one routine, nested `IF` branches included. */
export const MAX_ROUTINE_STEPS = 50;
export const MAX_DRAW_COUNT = 60;
/** `IF` inside `IF` … at most this deep. */
export const MAX_ROUTINE_DEPTH = 3;
export const MAX_TRIGGERS = 8;
const FORBIDDEN_PROPS = new Set(['id', 'type', 'routine', 'triggers']);

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every(isStr);
const isSeatRef = (v: unknown): v is RoutineSeatRef => v === 'caller' || v === 'turn';
const badCount = (v: unknown) => v !== undefined && (!isNum(v) || v < 1 || v > MAX_DRAW_COUNT);
const optStr = (v: unknown) => v === undefined || isStr(v);

/** Parse state: steps counted so far across all branches. */
interface Budget {
  steps: number;
}

/** Validates one step; returns an error message key on failure. */
function checkStep(raw: unknown, depth: number, budget: Budget): RoutineStep | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'not_object';
  const s = raw as Record<string, unknown>;
  switch (s.op) {
    case 'SHUFFLE':
      return isStr(s.deck) ? { op: 'SHUFFLE', deck: s.deck } : 'missing_field';
    case 'DRAW':
      if (!isStr(s.deck) || !optStr(s.to)) return 'missing_field';
      if (badCount(s.count)) return 'bad_count';
      return {
        op: 'DRAW',
        deck: s.deck,
        count: s.count as number | undefined,
        to: s.to as string | undefined,
      };
    case 'ROLL':
      if (isStrList(s.dice)) return { op: 'ROLL', dice: s.dice };
      return isSeatRef(s.seat) ? { op: 'ROLL', seat: s.seat } : 'missing_field';
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
      if (!isNum(s.delta)) return 'missing_field';
      if (isStr(s.counter)) return { op: 'COUNTER', counter: s.counter, delta: s.delta };
      return isSeatRef(s.seat) ? { op: 'COUNTER', seat: s.seat, delta: s.delta } : 'missing_field';
    case 'TIMER':
      return isStr(s.timer) && (s.action === 'toggle' || s.action === 'reset')
        ? { op: 'TIMER', timer: s.timer, action: s.action }
        : 'missing_field';
    case 'SPIN':
      return isStr(s.spinner) ? { op: 'SPIN', spinner: s.spinner } : 'missing_field';
    case 'NEXT_STATE':
      return isStr(s.widget) ? { op: 'NEXT_STATE', widget: s.widget } : 'missing_field';
    case 'DEAL':
      if (!isStr(s.deck)) return 'missing_field';
      if (badCount(s.count ?? 1)) return 'bad_count';
      return { op: 'DEAL', deck: s.deck, count: (s.count as number | undefined) ?? 1 };
    case 'TAKE_FROM_BAG':
      if (!isStr(s.bag) || !optStr(s.to)) return 'missing_field';
      if (badCount(s.count)) return 'bad_count';
      return {
        op: 'TAKE_FROM_BAG',
        bag: s.bag,
        count: s.count as number | undefined,
        to: s.to as string | undefined,
      };
    case 'PLACE_IN_HOLDER':
      return isStr(s.widget) && isStr(s.holder)
        ? { op: 'PLACE_IN_HOLDER', widget: s.widget, holder: s.holder }
        : 'missing_field';
    case 'SET_STATE':
      return isStr(s.widget) && isNum(s.state) && Number.isInteger(s.state) && s.state >= 0
        ? { op: 'SET_STATE', widget: s.widget, state: s.state }
        : 'missing_field';
    case 'TURN':
      if (s.to !== undefined && s.to !== 'next' && s.to !== 'previous' && s.to !== 'caller')
        return 'missing_field';
      return s.to === undefined ? { op: 'TURN' } : { op: 'TURN', to: s.to };
    case 'IF': {
      if (depth >= MAX_ROUTINE_DEPTH) return 'too_deep';
      const cond = parseCondition(s.if);
      if (!cond) return 'bad_condition';
      if (!Array.isArray(s.then) || (s.else !== undefined && !Array.isArray(s.else)))
        return 'missing_field';
      const then = checkSteps(s.then, depth + 1, budget);
      if (typeof then === 'string') return then;
      if (s.else === undefined) return { op: 'IF', if: cond, then };
      const otherwise = checkSteps(s.else as unknown[], depth + 1, budget);
      return typeof otherwise === 'string'
        ? otherwise
        : { op: 'IF', if: cond, then, else: otherwise };
    }
    default:
      return 'unknown_op';
  }
}

/** A branch's steps; an error inside a branch is reported at the outer step. */
function checkSteps(list: unknown[], depth: number, budget: Budget): RoutineStep[] | string {
  const out: RoutineStep[] = [];
  for (const raw of list) {
    budget.steps += 1;
    if (budget.steps > MAX_ROUTINE_STEPS) return 'too_many_steps';
    const step = checkStep(raw, depth, budget);
    if (typeof step === 'string') return step;
    out.push(step);
  }
  return out;
}

export type RoutineParseResult =
  { ok: true; routine: RoutineStep[] } | { ok: false; error: string; step?: number };

const fromJson = (input: unknown): { value: unknown } | null => {
  if (typeof input !== 'string') return { value: input };
  try {
    return { value: JSON.parse(input) };
  } catch {
    return null;
  }
};

/** Parses routine JSON (an array of steps). Errors carry a message key and the 1-based step. */
export function parseRoutine(input: unknown): RoutineParseResult {
  const parsed = fromJson(input);
  if (!parsed) return { ok: false, error: 'invalid_json' };
  const value = parsed.value;
  if (!Array.isArray(value)) return { ok: false, error: 'not_array' };
  if (value.length > MAX_ROUTINE_STEPS) return { ok: false, error: 'too_many_steps' };
  const budget: Budget = { steps: 0 };
  const routine: RoutineStep[] = [];
  for (let i = 0; i < value.length; i++) {
    budget.steps += 1;
    const step =
      budget.steps > MAX_ROUTINE_STEPS ? 'too_many_steps' : checkStep(value[i], 0, budget);
    if (typeof step === 'string') return { ok: false, error: step, step: i + 1 };
    routine.push(step);
  }
  return { ok: true, routine };
}

function checkTrigger(raw: unknown): RoutineTrigger | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const t = raw as Record<string, unknown>;
  switch (t.on) {
    case 'onDrop':
      return isStr(t.holder) ? { on: 'onDrop', holder: t.holder } : null;
    case 'onEnterZone':
      return isStr(t.zone) ? { on: 'onEnterZone', zone: t.zone } : null;
    case 'onCounter':
      return isStr(t.counter) ? { on: 'onCounter', counter: t.counter } : null;
    case 'onTurnStart':
      if (t.seat === undefined) return { on: 'onTurnStart' };
      return Number.isInteger(t.seat) && (t.seat as number) >= 0
        ? { on: 'onTurnStart', seat: t.seat as number }
        : null;
    default:
      return null;
  }
}

export type TriggerParseResult =
  { ok: true; triggers: RoutineTrigger[] } | { ok: false; error: string; step?: number };

/** Parses a button's `triggers` list; errors use the routine message keys (`step` = trigger). */
export function parseTriggers(input: unknown): TriggerParseResult {
  const parsed = fromJson(input);
  if (!parsed) return { ok: false, error: 'invalid_json' };
  if (!Array.isArray(parsed.value)) return { ok: false, error: 'not_array' };
  if (parsed.value.length > MAX_TRIGGERS) return { ok: false, error: 'too_many_triggers' };
  const triggers: RoutineTrigger[] = [];
  for (let i = 0; i < parsed.value.length; i++) {
    const trigger = checkTrigger(parsed.value[i]);
    if (!trigger) return { ok: false, error: 'bad_trigger', step: i + 1 };
    triggers.push(trigger);
  }
  return { ok: true, triggers };
}
