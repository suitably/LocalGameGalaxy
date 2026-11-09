/**
 * Routine data model: steps, conditions, triggers [ID: GAME-TABLETOP-ROUTINE-TYPES]
 *
 * Re-exported from `types.ts`; behaviour in `routines.ts` (parse), `routineRunner.ts`,
 * `routineConditions.ts` and `routineTriggers.ts`.
 */

/** A seat relative to the run: who pressed the button (host-resolved) or whose turn it is. */
export type RoutineSeatRef = 'caller' | 'turn';

export type RoutineCmp = '==' | '!=' | '<' | '<=' | '>' | '>=';

/** A number read from the table when an `IF` runs; see `logic/routineConditions.ts`. */
export type RoutineOperand =
  { of: 'counter' | 'die' | 'count' | 'state'; widget: string } | { of: 'turn' | 'caller' };

export interface RoutineCondition {
  left: RoutineOperand;
  cmp: RoutineCmp;
  right: number | RoutineOperand;
}

/** One step of a button routine; see `logic/routineParse.ts` for limits and validation. */
export type RoutineStep =
  | { op: 'SHUFFLE'; deck: string }
  | { op: 'DRAW'; deck: string; count?: number; to?: string }
  /** `dice` by id, or every die of a seat (`ownerSeat` or in that seat's hand). */
  | { op: 'ROLL'; dice?: string[]; seat?: RoutineSeatRef }
  | { op: 'FLIP'; cards: string[] }
  | { op: 'MOVE'; widget: string; x: number; y: number }
  | { op: 'SET'; widget: string; props: Record<string, unknown> }
  /** One counter by id, or every counter a seat owns (`ownerSeat`). */
  | { op: 'COUNTER'; counter?: string; seat?: RoutineSeatRef; delta: number }
  | { op: 'TIMER'; timer: string; action: 'toggle' | 'reset' }
  | { op: 'SPIN'; spinner: string }
  | { op: 'NEXT_STATE'; widget: string }
  /** `count` cards to every hand, round robin in seat order. */
  | { op: 'DEAL'; deck: string; count: number }
  | { op: 'TAKE_FROM_BAG'; bag: string; count?: number; to?: string }
  | { op: 'PLACE_IN_HOLDER'; widget: string; holder: string }
  | { op: 'SET_STATE'; widget: string; state: number }
  /** Moves the turn (`seat.turn`) to the next or previous seat, or to the caller. */
  | { op: 'TURN'; to?: 'next' | 'previous' | 'caller' }
  | { op: 'IF'; if: RoutineCondition; then: RoutineStep[]; else?: RoutineStep[] };

/** When a button's routine runs by itself (host side, after the action that caused it). */
export type RoutineTrigger =
  /** Something was put into this holder (or deck). */
  | { on: 'onDrop'; holder: string }
  /** A seat's turn started; `seat` limits it to one seat index. */
  | { on: 'onTurnStart'; seat?: number }
  /** A widget's centre moved into this hidden zone. */
  | { on: 'onEnterZone'; zone: string }
  /** This counter's value changed. */
  | { on: 'onCounter'; counter: string };
