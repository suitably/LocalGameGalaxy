import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from './logger';
import { STORAGE_KEYS, storage } from './storageCore';

describe('createLogger', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
    storage.remove(STORAGE_KEYS.DEBUG_LOG);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    storage.remove(STORAGE_KEYS.DEBUG_LOG);
  });

  it('always logs warn and error with a scope prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger('Foo');
    log.warn('a', 1);
    log.error('b');
    expect(warn).toHaveBeenCalledWith('[Foo]', 'a', 1);
    expect(error).toHaveBeenCalledWith('[Foo]', 'b');
  });

  it('silences debug and info by default', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('Foo');
    log.debug('x');
    log.info('y');
    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('logs debug and info when the flag is 1', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    storage.set(STORAGE_KEYS.DEBUG_LOG, '1');
    const log = createLogger('Foo');
    log.debug('x');
    log.info('y');
    expect(debug).toHaveBeenCalledWith('[Foo]', 'x');
    expect(info).toHaveBeenCalledWith('[Foo]', 'y');
  });

  it('honours a scope list', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    storage.set(STORAGE_KEYS.DEBUG_LOG, 'Bar, Foo');
    createLogger('Foo').debug('in');
    createLogger('Baz').debug('out');
    expect(debug).toHaveBeenCalledTimes(1);
  });

  it('logs debug in dev builds', () => {
    vi.stubEnv('DEV', true);
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    createLogger('Foo').debug('x');
    expect(debug).toHaveBeenCalledTimes(1);
  });
});
