import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  movedTooFar,
  LONG_PRESS_MS,
  LONG_PRESS_TOLERANCE,
  useTouchLongPress,
} from '../useTouchLongPress';

describe('movedTooFar (#548)', () => {
  it('treats small finger jitter as a still press and larger moves as a drag', () => {
    const start = { x: 100, y: 100 };
    expect(movedTooFar(start, { x: 104, y: 103 })).toBe(false);
    expect(movedTooFar(start, { x: 100 + LONG_PRESS_TOLERANCE, y: 100 })).toBe(false);
    expect(movedTooFar(start, { x: 108, y: 108 })).toBe(true);
  });
});

/** Renders the hook once (the tests run without a DOM) and returns its handlers. */
function mountLongPress(onLongPress: () => void) {
  let api: ReturnType<typeof useTouchLongPress> | null = null;
  const Probe = () => {
    api = useTouchLongPress(onLongPress);
    return null;
  };
  renderToString(createElement(Probe));
  return { current: api! };
}

const pointerMove = (clientX: number, clientY: number) =>
  Object.assign(new Event('pointermove'), { clientX, clientY });

describe('useTouchLongPress (#684)', () => {
  const press = { pointerType: 'touch', clientX: 100, clientY: 100 } as React.PointerEvent;

  it('opens after a still press, but not when the finger moves away from the widget', () => {
    vi.useFakeTimers();
    vi.stubGlobal('window', new EventTarget());
    const onLongPress = vi.fn();
    const result = mountLongPress(onLongPress);

    result.current.onPointerDownCapture(press);
    window.dispatchEvent(pointerMove(103, 102)); // jitter stays a press
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);

    // During a drag the moves reach the window, not the widget: they still cancel the press.
    result.current.onPointerDownCapture(press);
    window.dispatchEvent(pointerMove(160, 100));
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
