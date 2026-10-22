import { describe, it, expect } from 'vitest';
import { formatTimer, resetTimer, spinTo, timerDisplayMs, toggleTimer } from '../tableTools';
import { tabletopReducer } from '../tabletopReducer';
import { createWidget } from '../widgetTemplates';
import type { SpinnerWidget, TimerWidget } from '../types';

const timer = (durationMs: number): TimerWidget =>
  ({
    id: 't',
    type: 'timer',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zIndex: 1,
    durationMs,
    elapsedMs: 0,
  }) as TimerWidget;

describe('tableTools (#449)', () => {
  it('a countdown runs, pauses and never goes below zero', () => {
    let t = toggleTimer(timer(10_000), 1_000);
    expect(timerDisplayMs(t, 4_000)).toBe(7_000);
    t = toggleTimer(t, 4_000);
    expect(t.runningSince).toBeUndefined();
    expect(timerDisplayMs(t, 99_000)).toBe(7_000);
    t = toggleTimer(t, 100_000);
    expect(timerDisplayMs(t, 200_000)).toBe(0);
    expect(resetTimer(t)).toMatchObject({ elapsedMs: 0, runningSince: undefined });
  });

  it('a stopwatch counts up', () => {
    expect(timerDisplayMs(toggleTimer(timer(0), 0), 65_000)).toBe(65_000);
  });

  it('formats m:ss and h:mm:ss', () => {
    expect(formatTimer(65_400)).toBe('1:05');
    expect(formatTimer(3_726_000)).toBe('1:02:06');
  });

  it('spinTo lands the chosen option under the pointer after full turns', () => {
    const s = createWidget('spinner', 's', 0, 0, 1) as SpinnerWidget;
    const r = spinTo(s, 2);
    expect(r.value).toBe(2);
    expect(r.angle).toBeGreaterThanOrEqual(3 * 360);
    const slice = 360 / s.options.length;
    // Option 2's centre (2.5 slices) plus the wheel angle is a multiple of 360.
    expect((r.angle + 2.5 * slice) % 360).toBeCloseTo(0);
    expect(spinTo(r, -1).value).toBe(s.options.length - 1);
  });

  it('reducer: TOGGLE_TIMER and SPIN_SPINNER update the widgets', () => {
    const game = {
      id: 'g',
      name: 'G',
      version: '1',
      minPlayers: 1,
      maxPlayers: 2,
      supportedModes: ['local_pass_and_play' as const],
      table: { width: 800, height: 600 },
      widgets: { t: timer(5_000), s: createWidget('spinner', 's', 0, 0, 1) },
    };
    let state = tabletopReducer(
      { game, flyingCards: [] },
      { type: 'TOGGLE_TIMER', payload: { timerId: 't', now: 42 } },
    );
    expect((state.game.widgets.t as TimerWidget).runningSince).toBe(42);
    state = tabletopReducer(state, { type: 'SPIN_SPINNER', payload: { spinnerId: 's', index: 4 } });
    expect((state.game.widgets.s as SpinnerWidget).value).toBe(4);
  });
});
