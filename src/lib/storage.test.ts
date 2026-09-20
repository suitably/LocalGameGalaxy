import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import { storage, sessionStorageSafe, STORAGE_KEYS } from './storage';

describe('storage lib', () => {
  let mockLocalStorageStore: Record<string, string> = {};
  let mockSessionStorageStore: Record<string, string> = {};

  const createMockStorage = (storeRef: () => Record<string, string>): Storage => {
    return {
      getItem: (key: string) => storeRef()[key] ?? null,
      setItem: (key: string, value: string) => {
        storeRef()[key] = String(value);
      },
      removeItem: (key: string) => {
        delete storeRef()[key];
      },
      clear: () => {
        const store = storeRef();
        for (const k of Object.keys(store)) {
          delete store[k];
        }
      },
      key: (index: number) => Object.keys(storeRef())[index] ?? null,
      get length() {
        return Object.keys(storeRef()).length;
      },
    };
  };

  const mockLocalStorageObj = createMockStorage(() => mockLocalStorageStore);
  const mockSessionStorageObj = createMockStorage(() => mockSessionStorageStore);

  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorageObj,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    mockLocalStorageStore = {};
    mockSessionStorageStore = {};
    storage.clear();
    sessionStorageSafe.remove('test_key');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorageObj,
      writable: true,
      configurable: true,
    });
  });

  describe('storage.get error handling & fallback', () => {
    it('returns value from localStorage when available', () => {
      storage.set('my_key', 'stored_value');
      expect(storage.get('my_key')).toBe('stored_value');
    });

    it('returns fallback when key does not exist in localStorage', () => {
      expect(storage.get('non_existent', 'default')).toBe('default');
    });

    it('falls back to memoryFallback when localStorage.getItem throws an error', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: LocalStorage access denied');
      });

      // Since getItem throws, get should catch the error and return memoryFallback value or fallback argument
      expect(storage.get('test_key', 'fallback_val')).toBe('fallback_val');

      // Now set a value using storage.set (which sets in memoryFallback as well even if localStorage.setItem fails)
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      storage.set('mem_key', 'mem_value');

      expect(storage.get('mem_key', 'fallback_val')).toBe('mem_value');
    });

    it('handles localStorage throwing on set, remove, clear, and findKeysWithPrefix', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('Disabled');
      });
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Disabled');
      });
      vi.spyOn(localStorage, 'clear').mockImplementation(() => {
        throw new Error('Disabled');
      });
      vi.spyOn(localStorage, 'key').mockImplementation(() => {
        throw new Error('Disabled');
      });

      expect(() => storage.set('k', 'v')).not.toThrow();
      expect(() => storage.remove('k')).not.toThrow();
      expect(() => storage.clear()).not.toThrow();
      expect(() => storage.findKeysWithPrefix('pref')).not.toThrow();
    });

    it('handles environment where localStorage is undefined', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      storage.set('undef_key', 'undef_val');
      expect(storage.get('undef_key')).toBe('undef_val');
      expect(storage.get('missing', 'default')).toBe('default');

      expect(storage.findKeysWithPrefix('undef_')).toEqual(['undef_key']);

      storage.remove('undef_key');
      expect(storage.get('undef_key', 'default')).toBe('default');

      storage.set('undef_key2', 'val2');
      storage.clear();
      expect(storage.get('undef_key2', 'default')).toBe('default');
    });
  });

  describe('JSON helpers', () => {
    it('getJson and setJson store and parse JSON objects correctly', () => {
      const data = { foo: 'bar', num: 42 };
      storage.setJson('json_key', data);

      expect(storage.getJson('json_key', {})).toEqual(data);
    });

    it('getJson returns fallback when key is not present or contains invalid JSON', () => {
      expect(storage.getJson('missing_key', { fallback: true })).toEqual({ fallback: true });

      storage.set('invalid_json', '{ bad json ...');
      expect(storage.getJson('invalid_json', { fallback: true })).toEqual({ fallback: true });
    });
  });

  describe('findKeysWithPrefix', () => {
    it('finds keys starting with prefix from localStorage', () => {
      storage.set('prefix_1', 'a');
      storage.set('prefix_2', 'b');
      storage.set('other_3', 'c');

      const matching = storage.findKeysWithPrefix('prefix_');
      expect(matching.sort()).toEqual(['prefix_1', 'prefix_2']);
    });
  });

  describe('Accessor helpers', () => {
    it('manages Helper config correctly', () => {
      expect(storage.getHelperUrl()).toBe('http://localhost:3000');
      storage.setHelperUrl('http://192.168.1.50:3000');
      expect(storage.getHelperUrl()).toBe('http://192.168.1.50:3000');

      expect(storage.getHelperToken()).toBe('');
      storage.setHelperToken('secret123');
      expect(storage.getHelperToken()).toBe('secret123');

      expect(storage.isHelperActive()).toBe(true);
      storage.setHelperActive(false);
      expect(storage.isHelperActive()).toBe(false);
      storage.setHelperActive(true);
      expect(storage.isHelperActive()).toBe(true);
    });

    it('manages Signaling URL & Tracker URLs correctly', () => {
      expect(storage.getSignalingUrl()).toBe('ws://localhost:8000');

      storage.setSignalingUrl('wss://custom-signal.com');
      expect(storage.getSignalingUrl()).toBe('wss://custom-signal.com');

      storage.remove(STORAGE_KEYS.SIGNALING_URL);
      storage.setHelperActive(false);
      expect(storage.getSignalingUrl()).toBe('');

      expect(storage.getDisabledTrackerUrls('game1')).toEqual([]);
      storage.setDisabledTrackerUrls(['tracker1', 'tracker2'], 'game1');
      expect(storage.getDisabledTrackerUrls('game1')).toEqual(['tracker1', 'tracker2']);

      // Invalid JSON handling for disabled tracker URLs
      storage.set('game1_disabled_tracker_urls', '{ invalid json');
      expect(storage.getDisabledTrackerUrls('game1')).toEqual([]);
    });

    it('manages Push Relay & Notification Method & Ntfy Topic', () => {
      expect(storage.getPushRelayUrl()).toBe('');
      storage.setPushRelayUrl('https://relay.example.com/');
      expect(storage.getPushRelayUrl()).toBe('https://relay.example.com');

      expect(storage.getNotificationMethod()).toBe('auto');
      storage.setNotificationMethod('ntfy');
      expect(storage.getNotificationMethod()).toBe('ntfy');
      storage.setNotificationMethod('invalid' as any);
      expect(storage.getNotificationMethod()).toBe('auto');

      expect(storage.getNtfyServerUrl()).toBe('https://ntfy.sh');
      storage.setNtfyServerUrl('https://custom.ntfy.sh/');
      expect(storage.getNtfyServerUrl()).toBe('https://custom.ntfy.sh');

      const topic = storage.getUserNtfyTopic();
      expect(topic).toMatch(/^lgg-user-/);

      storage.setUserNtfyTopic('my-custom-topic!@#$');
      expect(storage.getUserNtfyTopic()).toBe('my-custom-topic____');

      const newTopic = storage.regenerateUserNtfyTopic();
      expect(newTopic).toMatch(/^lgg-user-/);
      expect(newTopic).not.toBe('my-custom-topic____');
    });
  });

  describe('sessionStorageSafe', () => {
    it('stores, gets, and removes values from sessionStorage', () => {
      sessionStorageSafe.set('sess_key', 'sess_val');
      expect(sessionStorageSafe.get('sess_key')).toBe('sess_val');

      sessionStorageSafe.remove('sess_key');
      expect(sessionStorageSafe.get('sess_key', 'fallback')).toBe('fallback');
    });

    it('handles sessionStorage errors gracefully', () => {
      vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Access denied');
      });

      expect(() => sessionStorageSafe.set('s_key', 's_val')).not.toThrow();
      expect(sessionStorageSafe.get('s_key', 'fb')).toBe('s_val');
      expect(() => sessionStorageSafe.remove('s_key')).not.toThrow();
    });

    it('handles sessionStorageJson helpers', () => {
      sessionStorageSafe.setJson('json_s_key', { a: 1 });
      expect(sessionStorageSafe.getJson('json_s_key', {})).toEqual({ a: 1 });

      sessionStorageSafe.set('invalid_s_json', 'invalid');
      expect(sessionStorageSafe.getJson('invalid_s_json', 'fallback')).toBe('fallback');
    });

    it('handles undefined sessionStorage', () => {
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      sessionStorageSafe.set('undef_s_key', 'val');
      expect(sessionStorageSafe.get('undef_s_key')).toBe('val');
      sessionStorageSafe.remove('undef_s_key');
      expect(sessionStorageSafe.get('undef_s_key', 'fb')).toBe('fb');
    });
  });
});
