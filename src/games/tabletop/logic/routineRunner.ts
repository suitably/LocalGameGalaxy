/**
 * Runs routine steps as reducer actions [ID: LOGIC-TABLETOP-ROUTINE-RUNNER]
 *
 * Steps run one after another against the current table, so `IF` and per-seat ops see what the
 * steps before them did. Random results come from the context's seeded `rng` and are written into
 * the actions (die value, shuffle order, spawned id, spinner index), never drawn by a sub-reducer.
 */
import type { TabletopAction, TabletopGameState } from './tabletopReducer';
import type {
  DeckWidget,
  DieWidget,
  RoutineSeatRef,
  RoutineStep,
  SpinnerWidget,
  TabletopWidget,
} from './types';
import type { WidgetPatch } from './widgetEdits';
import { MAX_DRAW_COUNT, MAX_ROUTINE_STEPS } from './routines';
import { evaluateCondition } from './routineConditions';
import { dealActions } from './dealCards';
import { rollValue, shuffled, spawnId, type Rng } from './rng';
import { seatWidgetsOfType, turnSeatIndex } from './turnOrder';

type Widgets = Record<string, TabletopWidget>;
export type ApplyAction = (state: TabletopGameState, action: TabletopAction) => TabletopGameState;

/** Steps one top-level action may run, triggered routines included. */
export const MAX_STEPS_PER_ACTION = 4 * MAX_ROUTINE_STEPS;

export interface RoutineContext {
  rng: Rng;
  /** Seat index of whoever caused the run (host-resolved), or null. */
  seat: number | null;
  now: number;
  /** Shared across a top-level action and the triggers it fires. */
  budget: { steps: number };
}

/**
 * A deck by id, or the pile deck of a holder (VirtualTabletop holders with a pile child): the
 * deck whose `parent` is the holder, else the one whose centre lies on it (imports drop `parent`).
 */
export function resolveDeckId(widgets: Widgets, id: string): string | undefined {
  const w = widgets[id];
  if (w?.type === 'deck') return id;
  if (w?.type !== 'holder') return undefined;
  const decks = Object.values(widgets).filter((c) => c.type === 'deck');
  const on = (d: TabletopWidget) => {
    const cx = d.x + d.width / 2;
    const cy = d.y + d.height / 2;
    return cx >= w.x && cx <= w.x + w.width && cy >= w.y && cy <= w.y + w.height;
  };
  return (decks.find((d) => d.parent === id) ?? decks.find(on))?.id;
}

function seatOf(ref: RoutineSeatRef, widgets: Widgets, ctx: RoutineContext): number | undefined {
  return ref === 'caller' ? (ctx.seat ?? undefined) : turnSeatIndex(widgets);
}

const times = <T>(n: number | undefined, make: () => T): T[] =>
  Array.from({ length: Math.min(n ?? 1, MAX_DRAW_COUNT) }, make);

/** The ids a per-seat op works on: listed ids, or that seat's widgets of `type`. */
function idsFor(
  ids: string[] | undefined,
  seat: RoutineSeatRef | undefined,
  type: TabletopWidget['type'],
  widgets: Widgets,
  ctx: RoutineContext,
): string[] {
  if (ids) return ids;
  const index = seat ? seatOf(seat, widgets, ctx) : undefined;
  return index === undefined ? [] : seatWidgetsOfType(widgets, index, type);
}

/** Reducer actions for one non-`IF` step against the current widgets. */
export function stepActions(
  step: Exclude<RoutineStep, { op: 'IF' }>,
  widgets: Widgets,
  ctx: RoutineContext,
): TabletopAction[] {
  switch (step.op) {
    case 'SHUFFLE': {
      const deckId = resolveDeckId(widgets, step.deck);
      if (!deckId) return [];
      const order = shuffled((widgets[deckId] as DeckWidget).cardIds, ctx.rng);
      return [{ type: 'SHUFFLE_DECK', payload: { deckId, order } }];
    }
    case 'DRAW': {
      const deckId = resolveDeckId(widgets, step.deck);
      if (!deckId) return [];
      return times(step.count, () => ({
        type: 'DRAW_CARD' as const,
        payload: { deckId, targetHolderId: step.to },
      }));
    }
    case 'DEAL': {
      const deckId = resolveDeckId(widgets, step.deck);
      return deckId ? dealActions(widgets, deckId, Math.min(step.count, MAX_DRAW_COUNT)) : [];
    }
    case 'ROLL':
      return idsFor(step.dice, step.seat, 'die', widgets, ctx).flatMap((dieId) => {
        const die = widgets[dieId];
        if (die?.type !== 'die') return [];
        const value = rollValue((die as DieWidget).sides, ctx.rng);
        return [{ type: 'ROLL_DIE' as const, payload: { dieId, value } }];
      });
    case 'COUNTER':
      return idsFor(
        step.counter ? [step.counter] : undefined,
        step.seat,
        'counter',
        widgets,
        ctx,
      ).map((counterId) => ({
        type: 'UPDATE_COUNTER' as const,
        payload: { counterId, delta: step.delta },
      }));
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
    case 'TIMER':
      return [
        step.action === 'toggle'
          ? { type: 'TOGGLE_TIMER', payload: { timerId: step.timer, now: ctx.now } }
          : { type: 'RESET_TIMER', payload: { timerId: step.timer } },
      ];
    case 'SPIN': {
      const spinner = widgets[step.spinner];
      if (spinner?.type !== 'spinner') return [];
      const options = Math.max(1, (spinner as SpinnerWidget).options.length);
      const index = Math.floor(ctx.rng() * options);
      return [{ type: 'SPIN_SPINNER', payload: { spinnerId: step.spinner, index } }];
    }
    case 'NEXT_STATE':
      return [{ type: 'NEXT_STATE', payload: { widgetId: step.widget } }];
    case 'SET_STATE':
      return [{ type: 'SET_STATE', payload: { widgetId: step.widget, index: step.state } }];
    case 'TAKE_FROM_BAG':
      return times(step.count, () => ({
        type: 'DRAW_FROM_BAG' as const,
        payload: { bagId: step.bag, targetHolderId: step.to, spawnedId: spawnId(ctx.rng) },
      }));
    case 'PLACE_IN_HOLDER':
      return [
        { type: 'SNAP_TO_HOLDER', payload: { widgetId: step.widget, holderId: step.holder } },
      ];
    case 'TURN':
      if (step.to === 'caller')
        return ctx.seat === null ? [] : [{ type: 'NEXT_TURN', payload: { seat: ctx.seat } }];
      return [{ type: 'NEXT_TURN', payload: { step: step.to === 'previous' ? -1 : 1 } }];
  }
}

/** Applies the steps in order; stops when the action's step budget is used up. */
export function runRoutine(
  state: TabletopGameState,
  steps: RoutineStep[],
  ctx: RoutineContext,
  apply: ApplyAction,
): TabletopGameState {
  let current = state;
  for (const step of steps) {
    if (ctx.budget.steps <= 0) return current;
    ctx.budget.steps -= 1;
    if (step.op === 'IF') {
      const branch = evaluateCondition(step.if, current.game.widgets, ctx.seat)
        ? step.then
        : (step.else ?? []);
      current = runRoutine(current, branch, ctx, apply);
    } else {
      current = stepActions(step, current.game.widgets, ctx).reduce(apply, current);
    }
  }
  return current;
}
