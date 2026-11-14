import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSteadyTicker } from './steadyTicker';

describe('startSteadyTicker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falls back to a page timer without workers and stops on request', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', undefined);
    const onTick = vi.fn();
    const stop = startSteadyTicker(30, onTick);
    vi.advanceTimersByTime(95);
    expect(onTick).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(200);
    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it('ticks from a worker when available and terminates it on stop', () => {
    const terminate = vi.fn();
    const posted: unknown[] = [];
    const workers: Array<{ onmessage: (() => void) | null }> = [];
    class FakeWorker {
      onmessage: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        workers.push(this);
      }
      postMessage(data: unknown) {
        posted.push(data);
      }
      terminate = terminate;
    }
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    const onTick = vi.fn();
    const stop = startSteadyTicker(33, onTick);
    expect(posted).toEqual([33]);
    workers[0]?.onmessage?.();
    expect(onTick).toHaveBeenCalledTimes(1);
    stop();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
