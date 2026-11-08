import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runBackHandlers } from '../../../lib/backButton';
import { useStageLifecycle } from './useStageLifecycle';

// The suite runs without a DOM: React's hooks run inline so the hook body can be exercised.
const cleanups = vi.hoisted(() => [] as Array<() => void>);
vi.mock('react', () => ({
  useRef: <T>(current: T) => ({ current }),
  useSyncExternalStore: (_sub: unknown, get: () => unknown) => get(),
  useEffect: (fn: () => void | (() => void)) => {
    const cleanup = fn();
    if (cleanup) cleanups.push(cleanup);
  },
}));
const wakeLock = vi.hoisted(() => vi.fn());
vi.mock('../../../hooks/useWakeLock', () => ({ useWakeLock: wakeLock }));

type FakeState = 'idle' | 'playing' | 'paused' | 'done';
function useSetup(state: FakeState, requested = false) {
  const engine = {
    state,
    subscribe: () => () => undefined,
    pause: vi.fn(() => {
      engine.state = 'paused';
    }),
  };
  const leave = vi.fn();
  const exit = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useStageLifecycle(engine as any, { leave, immersive: { requested, exit } });
  return { engine, leave, exit };
}

describe('useStageLifecycle', () => {
  beforeEach(() => {
    wakeLock.mockClear();
    cleanups.splice(0).forEach((fn) => fn());
  });

  it('holds the wake lock while a song plays', () => {
    useSetup('playing');
    expect(wakeLock).toHaveBeenLastCalledWith(true);
  });

  it.each<FakeState>(['idle', 'paused', 'done'])('releases the wake lock when %s', (state) => {
    useSetup(state);
    expect(wakeLock).toHaveBeenLastCalledWith(false);
  });

  it('back button with a running stage pauses it and leaves', () => {
    const { engine, leave } = useSetup('playing');
    expect(runBackHandlers()).toBe(true);
    expect(engine.pause).toHaveBeenCalled();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('back button closes the immersive view before leaving', () => {
    const { leave, exit } = useSetup('playing', true);
    expect(runBackHandlers()).toBe(true);
    expect(exit).toHaveBeenCalledTimes(1);
    expect(leave).not.toHaveBeenCalled();
  });

  it('back button on an idle stage falls through to the app default and unregisters on unmount', () => {
    const { leave } = useSetup('idle');
    expect(runBackHandlers()).toBe(false);
    expect(leave).not.toHaveBeenCalled();
    useSetup('paused');
    cleanups.splice(0).forEach((fn) => fn());
    expect(runBackHandlers()).toBe(false);
  });
});
