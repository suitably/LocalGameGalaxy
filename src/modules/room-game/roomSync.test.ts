import { describe, expect, it } from 'vitest';
import { guestAccept, hostApply } from './roomSync';

const add = (s: number, a: number) => s + a;

describe('room game sync', () => {
  it('the host applies allowed actions and counts revisions', () => {
    const next = hostApply({ state: 1, rev: 3 }, 2, 'p', add);
    expect(next).toEqual({ state: 3, rev: 4 });
    expect(hostApply({ state: 1, rev: 3 }, 2, 'p', add, () => false)).toBeNull();
    expect(hostApply({ state: 1, rev: 3 }, 0, 'p', (s) => s)).toBeNull();
  });

  it('a guest keeps the newer state', () => {
    expect(guestAccept(4, 5)).toBe(true);
    expect(guestAccept(5, 5)).toBe(false);
    expect(guestAccept(6, 5)).toBe(false);
  });
});
