import { describe, it, expect } from 'vitest';
import { findStalePeersByDevice } from './peerRegistry';

const peers = new Map<string, { deviceId?: string }>([
  ['old', { deviceId: 'phone-1' }],
  ['other', { deviceId: 'phone-2' }],
  ['anon', {}],
  ['new', { deviceId: 'phone-1' }],
]);

describe('findStalePeersByDevice', () => {
  it('returns earlier peers of the same device when it reconnects', () => {
    expect(findStalePeersByDevice(peers, 'new', 'phone-1')).toEqual(['old']);
  });

  it('never evicts the peer being kept or other devices', () => {
    expect(findStalePeersByDevice(peers, 'other', 'phone-2')).toEqual([]);
  });

  it('does nothing without a deviceId', () => {
    expect(findStalePeersByDevice(peers, 'new', undefined)).toEqual([]);
    expect(findStalePeersByDevice(peers, 'new', '')).toEqual([]);
  });
});
