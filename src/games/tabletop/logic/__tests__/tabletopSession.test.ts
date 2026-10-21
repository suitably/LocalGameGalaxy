import { describe, it, expect } from 'vitest';
import { sessionKey } from '../tabletopStorage';

describe('sessionKey (#449)', () => {
  it('separates party rooms from local play', () => {
    expect(sessionKey('ROOM1', 'chess')).toBe('room:ROOM1:chess');
    expect(sessionKey(null, 'chess')).toBe('local:chess');
    expect(sessionKey('ROOM1', 'chess')).not.toBe(sessionKey('ROOM2', 'chess'));
  });
});
