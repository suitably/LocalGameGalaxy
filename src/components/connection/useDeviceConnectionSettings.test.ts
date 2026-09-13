import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyScannedHelperConfig } from './useDeviceConnectionSettings';
import { storage, STORAGE_PREFIXES } from '../../lib/storage';

describe('useDeviceConnectionSettings - applyScannedHelperConfig', () => {
    const gameId = 'melodiq_test';
    const helperStorageKey = 'test_helper_url';
    const helperTokenKey = 'test_helper_token';

    let originalWindow: typeof globalThis.window;
    let dispatchEventMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        storage.remove(helperStorageKey);
        storage.remove(helperTokenKey);
        storage.remove(`${gameId}${STORAGE_PREFIXES.ENABLE_HELPER}`);

        originalWindow = globalThis.window;
        dispatchEventMock = vi.fn();
        (globalThis as unknown as { window: unknown }).window = {
            dispatchEvent: dispatchEventMock,
            location: { origin: 'http://localhost:3000' }
        };
    });

    afterEach(() => {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        vi.restoreAllMocks();
    });

    it('parses valid scanned URL and persists helper configuration to storage', () => {
        const rawUrl = 'http://192.168.1.100:3000/games/melodiq?role=client&helperUrl=http%3A%2F%2F192.168.1.100%3A5000&token=secret_abc#settings';

        const clientTarget = applyScannedHelperConfig(rawUrl, gameId, helperStorageKey, helperTokenKey);

        expect(clientTarget).toBe('/games/melodiq?role=client&helperUrl=http%3A%2F%2F192.168.1.100%3A5000&token=secret_abc#settings');
        expect(storage.get(helperStorageKey)).toBe('http://192.168.1.100:5000');
        expect(storage.get(`${gameId}${STORAGE_PREFIXES.ENABLE_HELPER}`)).toBe('true');
        expect(storage.get(helperTokenKey)).toBe('secret_abc');
        expect(dispatchEventMock).toHaveBeenCalledWith(expect.objectContaining({ type: `${gameId}_settings_updated` }));
    });

    it('handles apiKey query param fallback when token is not present', () => {
        const rawUrl = 'http://localhost:3000/client?apiKey=my_api_key_123';
        const clientTarget = applyScannedHelperConfig(rawUrl, gameId, undefined, helperTokenKey);

        expect(clientTarget).toBe('/client?apiKey=my_api_key_123');
        expect(storage.get(helperTokenKey)).toBe('my_api_key_123');
    });

    it('returns null and does not throw on invalid URL', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = applyScannedHelperConfig('not-a-valid-url-format', gameId, helperStorageKey, helperTokenKey);

        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
