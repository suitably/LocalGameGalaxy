/**
 * Routine triggers: runs a button's routine after the action that caused the event [ID: LOGIC-TABLETOP-ROUTINE-TRIGGERS]
 *
 * Events are read from the table before and after an action (holder contents, counter values,
 * turn seat, positions in hidden zones), so they work for every action that causes them. A
 * triggered routine may cause further events, up to `MAX_TRIGGER_DEPTH` rounds and
 * `MAX_TRIGGER_RUNS` runs per action; the shared step budget still applies.
 */
import type { TabletopGameState } from './tabletopReducer';
import type {
  ButtonWidget,
  CounterWidget,
  DeckWidget,
  HiddenZone,
  HolderWidget,
  RoutineTrigger,
  TabletopGameDefinition,
  TabletopWidget,
} from './types';
import { runRoutine, type ApplyAction, type RoutineContext } from './routineRunner';
import { turnSeatIndex } from './turnOrder';

export const MAX_TRIGGER_DEPTH = 3;
export const MAX_TRIGGER_RUNS = 10;

type Widgets = Record<string, TabletopWidget>;

/** Ids inside a holder or deck. */
function contents(w: TabletopWidget | undefined): string[] {
  if (w?.type === 'holder') return (w as HolderWidget).childIds ?? [];
  if (w?.type === 'deck') return (w as DeckWidget).cardIds ?? [];
  return [];
}

function gainedContent(before: Widgets, after: Widgets, id: string): boolean {
  if (before[id] === after[id]) return false;
  const old = new Set(contents(before[id]));
  return contents(after[id]).some((c) => !old.has(c));
}

const centreIn = (w: TabletopWidget | undefined, z: HiddenZone): boolean => {
  if (!w || w.type === 'seat') return false;
  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
};

function enteredZone(
  before: TabletopGameDefinition,
  after: TabletopGameDefinition,
  zoneId: string,
): boolean {
  const zone = after.hiddenZones?.[zoneId];
  if (!zone) return false;
  return Object.entries(after.widgets).some(
    ([id, w]) =>
      w !== before.widgets[id] && centreIn(w, zone) && !centreIn(before.widgets[id], zone),
  );
}

/** Whether this trigger's event happened between the two tables. */
export function triggerFired(
  trigger: RoutineTrigger,
  before: TabletopGameDefinition,
  after: TabletopGameDefinition,
): boolean {
  switch (trigger.on) {
    case 'onDrop':
      return gainedContent(before.widgets, after.widgets, trigger.holder);
    case 'onCounter': {
      const a = before.widgets[trigger.counter] as CounterWidget | undefined;
      const b = after.widgets[trigger.counter] as CounterWidget | undefined;
      return b?.type === 'counter' && a?.value !== b.value;
    }
    case 'onTurnStart': {
      const seat = turnSeatIndex(after.widgets);
      return (
        seat !== undefined &&
        seat !== turnSeatIndex(before.widgets) &&
        (trigger.seat === undefined || trigger.seat === seat)
      );
    }
    case 'onEnterZone':
      return enteredZone(before, after, trigger.zone);
  }
}

const triggerButtons = (widgets: Widgets): ButtonWidget[] =>
  Object.values(widgets).filter(
    (w): w is ButtonWidget =>
      w.type === 'button' && ((w as ButtonWidget).triggers?.length ?? 0) > 0,
  );

/**
 * Runs every button whose trigger fired between `before` and `after`, then the ones those runs
 * fired, and so on. A turn-start run counts the new turn seat as its caller.
 */
export function runTriggers(
  before: TabletopGameState,
  after: TabletopGameState,
  ctx: RoutineContext,
  apply: ApplyAction,
): TabletopGameState {
  if (before.game.widgets === after.game.widgets && before.game === after.game) return after;
  let prev = before;
  let current = after;
  let runs = 0;
  for (let depth = 0; depth < MAX_TRIGGER_DEPTH; depth++) {
    const fired = triggerButtons(current.game.widgets).filter((b) =>
      b.triggers!.some((t) => triggerFired(t, prev.game, current.game)),
    );
    if (fired.length === 0) break;
    const roundStart = current;
    for (const button of fired) {
      if (runs++ >= MAX_TRIGGER_RUNS) return current;
      const turnStart = button.triggers!.some(
        (t) => t.on === 'onTurnStart' && triggerFired(t, prev.game, roundStart.game),
      );
      const seat = turnStart ? (turnSeatIndex(roundStart.game.widgets) ?? ctx.seat) : ctx.seat;
      current = runRoutine(current, button.routine, { ...ctx, seat }, apply);
    }
    prev = roundStart;
  }
  return current;
}
