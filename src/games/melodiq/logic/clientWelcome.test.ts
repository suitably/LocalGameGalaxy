import { beforeEach, describe, expect, it } from 'vitest';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { markClientWelcomed, needsClientWelcome } from './clientWelcome';

describe('clientWelcome', () => {
  beforeEach(() => storage.remove(STORAGE_KEYS.MELODIQ_CLIENT_WELCOMED));

  it('asks for the welcome page on the first join only', () => {
    expect(needsClientWelcome()).toBe(true);
    markClientWelcomed();
    expect(needsClientWelcome()).toBe(false);
  });
});
