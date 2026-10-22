import { describe, expect, it } from 'vitest';
import { getDeviceId } from './deviceIdentity';
import { storage, STORAGE_KEYS } from './storage';

describe('getDeviceId', () => {
  it('creates the id once and keeps it', () => {
    storage.remove(STORAGE_KEYS.DEVICE_ID);
    const id = getDeviceId();
    expect(id).toMatch(/^dev_/);
    expect(getDeviceId()).toBe(id);
  });
});
