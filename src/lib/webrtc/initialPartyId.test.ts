import { describe, expect, it } from 'vitest';
import { initialPartyId, randomPartyId } from './initialPartyId';

describe('initialPartyId', () => {
  it('prefers the fixed lobby room, then the stored code', () => {
    expect(initialPartyId('ROOM1', 'OLD123')).toBe('ROOM1');
    expect(initialPartyId(null, 'OLD123')).toBe('OLD123');
  });

  it('falls back to a new 6-character code', () => {
    expect(initialPartyId(undefined, null)).toMatch(/^[A-Z0-9]{1,6}$/);
    expect(randomPartyId()).toMatch(/^[A-Z0-9]+$/);
  });
});
