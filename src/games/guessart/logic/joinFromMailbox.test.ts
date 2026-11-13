import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importFromMailbox, type JoinMailboxDeps } from './joinFromMailbox';
import type { GameSnapshot } from './types';

const snapshotOf = (id: string) => ({ game: { id }, round: null }) as unknown as GameSnapshot;

function setup() {
  let listener: ((snapshot: GameSnapshot) => Promise<void> | void) | null = null;
  const unsubscribe = vi.fn();
  const importSnapshot = vi.fn(async () => undefined);
  const deps: JoinMailboxDeps = {
    subscribe: (_gameId, l) => {
      listener = l;
      return unsubscribe;
    },
    importSnapshot,
  };
  return { deps, unsubscribe, importSnapshot, emit: (s: GameSnapshot) => listener?.(s) };
}

describe('importFromMailbox', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('imports the snapshot of the requested game and unsubscribes', async () => {
    const { deps, unsubscribe, importSnapshot, emit } = setup();
    const result = importFromMailbox('g1', deps, 1000);
    await emit(snapshotOf('g1'));
    await expect(result).resolves.toBe(true);
    expect(importSnapshot).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('ignores snapshots of other games and gives up after the timeout', async () => {
    const { deps, unsubscribe, importSnapshot, emit } = setup();
    const result = importFromMailbox('g1', deps, 1000);
    await emit(snapshotOf('other'));
    vi.advanceTimersByTime(1000);
    await expect(result).resolves.toBe(false);
    expect(importSnapshot).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
