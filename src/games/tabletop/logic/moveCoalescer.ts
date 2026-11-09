/**
 * Coalesces drag moves into at most one emitted move per interval [ID: LOGIC-TABLETOP-MOVE-COALESCER]
 *
 * A drag produces a pointer move every frame; each `MOVE_WIDGET` becomes a reducer run, a host
 * delta and a BroadcastChannel + MQTT message. The coalescer emits the first move at once, then
 * the latest move at most every `intervalMs` (trailing), and `flush` emits what is pending when
 * the drag ends (#684). Timers are injected so tests run without real time.
 */

export interface CoalescedMove {
  id: string;
  x: number;
  y: number;
  /** Drag gesture the move belongs to (`dragGesture.ts`). */
  gesture?: string;
}

export interface MoveCoalescerOptions {
  emit: (move: CoalescedMove) => void;
  intervalMs?: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface MoveCoalescer {
  /** Latest pointer position of the dragged widget. */
  push: (move: CoalescedMove) => void;
  /** Emits the pending move now and returns the last pushed move (the drop position), if any. */
  flush: () => CoalescedMove | null;
  /** Drops the pending move without emitting it. */
  cancel: () => void;
}

/** Network and undo budget for drags: at most one delta per 50 ms (TTS plan, slice 5). */
export const MOVE_COALESCE_MS = 50;

const sameMove = (a: CoalescedMove | null, b: CoalescedMove) =>
  a !== null && a.id === b.id && a.x === b.x && a.y === b.y;

export function createMoveCoalescer({
  emit,
  intervalMs = MOVE_COALESCE_MS,
  now = () => Date.now(),
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: MoveCoalescerOptions): MoveCoalescer {
  let pending: CoalescedMove | null = null;
  let lastPushed: CoalescedMove | null = null;
  let lastEmitted: CoalescedMove | null = null;
  let lastEmitAt = Number.NEGATIVE_INFINITY;
  let timer: unknown = null;

  const stopTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const fire = () => {
    timer = null;
    const move = pending;
    pending = null;
    if (!move || sameMove(lastEmitted, move)) return;
    lastEmitted = move;
    lastEmitAt = now();
    emit(move);
  };

  const reset = () => {
    stopTimer();
    pending = null;
    lastPushed = null;
    lastEmitted = null;
    lastEmitAt = Number.NEGATIVE_INFINITY;
  };

  return {
    push(move) {
      pending = move;
      lastPushed = move;
      const wait = intervalMs - (now() - lastEmitAt);
      if (wait <= 0) {
        stopTimer();
        fire();
      } else if (timer === null) {
        timer = setTimer(fire, wait);
      }
    },
    flush() {
      stopTimer();
      fire();
      const last = lastPushed;
      reset();
      return last;
    },
    cancel: reset,
  };
}
