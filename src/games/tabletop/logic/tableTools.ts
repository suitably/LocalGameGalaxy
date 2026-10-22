/**
 * Timer and spinner rules [ID: LOGIC-TABLETOP-TABLE-TOOLS]
 *
 * Times are passed in (`now`), so the host's reducer stays deterministic for a given action.
 */
import type { SpinnerWidget, TimerWidget } from './types';

/** Milliseconds counted so far, including the running stretch. */
export function timerElapsed(timer: TimerWidget, now: number): number {
  return (
    timer.elapsedMs + (timer.runningSince !== undefined ? Math.max(0, now - timer.runningSince) : 0)
  );
}

/** What the timer shows: remaining time for a countdown (never below 0), else elapsed. */
export function timerDisplayMs(timer: TimerWidget, now: number): number {
  const elapsed = timerElapsed(timer, now);
  return timer.durationMs > 0 ? Math.max(0, timer.durationMs - elapsed) : elapsed;
}

/** `m:ss` (or `h:mm:ss` from one hour). */
export function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function toggleTimer(timer: TimerWidget, now: number): TimerWidget {
  if (timer.runningSince === undefined) return { ...timer, runningSince: now };
  return { ...timer, elapsedMs: timerElapsed(timer, now), runningSince: undefined };
}

export function resetTimer(timer: TimerWidget): TimerWidget {
  return { ...timer, elapsedMs: 0, runningSince: undefined };
}

/** Lands on option `index`, after at least three full turns, so every spin animates. */
export function spinTo(spinner: SpinnerWidget, index: number): SpinnerWidget {
  const n = Math.max(1, spinner.options.length);
  const i = ((Math.floor(index) % n) + n) % n;
  const slice = 360 / n;
  // The pointer is at the top: option i is under it when the wheel is turned back by its centre.
  const target = 360 - (i * slice + slice / 2);
  const base = spinner.angle - (spinner.angle % 360) + 3 * 360;
  return { ...spinner, value: i, angle: base + target };
}
