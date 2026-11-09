import { describe, expect, it, vi } from 'vitest';
import { registerBackHandler, runBackHandlers } from './backButton';

describe('backButton registry', () => {
  it('asks the newest handler first and stops at the one that handles it', () => {
    const older = vi.fn(() => true);
    const newer = vi.fn(() => true);
    const offOlder = registerBackHandler(older);
    const offNewer = registerBackHandler(newer);
    expect(runBackHandlers()).toBe(true);
    expect(newer).toHaveBeenCalledTimes(1);
    expect(older).not.toHaveBeenCalled();
    offNewer();
    offOlder();
  });

  it('falls through to older handlers and reports false when none handles it', () => {
    const older = vi.fn(() => true);
    const off1 = registerBackHandler(older);
    const off2 = registerBackHandler(() => false);
    expect(runBackHandlers()).toBe(true);
    expect(older).toHaveBeenCalledTimes(1);
    off1();
    off2();
    expect(runBackHandlers()).toBe(false);
  });
});
