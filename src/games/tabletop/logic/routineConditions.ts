/**
 * `IF` conditions of routines: one comparison of table numbers [ID: LOGIC-TABLETOP-ROUTINE-CONDITIONS]
 */
import type {
  BagWidget,
  CounterWidget,
  DeckWidget,
  DieWidget,
  HolderWidget,
  RoutineCmp,
  RoutineCondition,
  RoutineOperand,
  TabletopWidget,
} from './types';
import { turnSeatIndex } from './turnOrder';

type Widgets = Record<string, TabletopWidget>;

export const ROUTINE_CMPS: readonly RoutineCmp[] = ['==', '!=', '<', '<=', '>', '>='];
export const OPERAND_KINDS = ['counter', 'die', 'count', 'state', 'turn', 'caller'] as const;

/** Pieces in a deck, holder or bag (infinite bag = Infinity). */
function countOf(w: TabletopWidget): number | undefined {
  switch (w.type) {
    case 'deck':
      return (w as DeckWidget).cardIds.length;
    case 'holder':
      return (w as HolderWidget).childIds.length;
    case 'bag': {
      const bag = w as BagWidget;
      return bag.isInfinite ? Infinity : (bag.itemIds?.length ?? bag.itemCount ?? 0);
    }
    default:
      return undefined;
  }
}

/** The operand's number, or undefined when the widget is missing or has no such number. */
export function operandValue(
  op: RoutineOperand,
  widgets: Widgets,
  caller: number | null,
): number | undefined {
  if (!('widget' in op)) return op.of === 'turn' ? turnSeatIndex(widgets) : (caller ?? undefined);
  const w = widgets[op.widget];
  if (!w) return undefined;
  switch (op.of) {
    case 'counter':
      return w.type === 'counter' ? (w as CounterWidget).value : undefined;
    case 'die':
      return w.type === 'die' ? (w as DieWidget).currentValue : undefined;
    case 'count':
      return countOf(w);
    case 'state':
      return w.stateIndex ?? 0;
  }
}

function compare(a: number, cmp: RoutineCmp, b: number): boolean {
  switch (cmp) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
  }
}

/** False whenever a side cannot be read (missing widget, nobody's turn, no caller seat). */
export function evaluateCondition(
  cond: RoutineCondition,
  widgets: Widgets,
  caller: number | null,
): boolean {
  const left = operandValue(cond.left, widgets, caller);
  const right =
    typeof cond.right === 'number' ? cond.right : operandValue(cond.right, widgets, caller);
  return left !== undefined && right !== undefined && compare(left, cond.cmp, right);
}

const isOperand = (v: unknown): v is RoutineOperand => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (o.of === 'turn' || o.of === 'caller') return true;
  return (
    (o.of === 'counter' || o.of === 'die' || o.of === 'count' || o.of === 'state') &&
    typeof o.widget === 'string' &&
    o.widget.length > 0
  );
};

/** Validated condition, or null. */
export function parseCondition(raw: unknown): RoutineCondition | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const rightOk = (typeof c.right === 'number' && Number.isFinite(c.right)) || isOperand(c.right);
  if (!isOperand(c.left) || !ROUTINE_CMPS.includes(c.cmp as RoutineCmp) || !rightOk) return null;
  return { left: c.left, cmp: c.cmp as RoutineCmp, right: c.right as RoutineCondition['right'] };
}
