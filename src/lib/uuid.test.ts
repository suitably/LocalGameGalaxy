import { describe, it, expect, afterEach, vi } from 'vitest';
import { generateUUID } from './uuid';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateUUID', () => {
    const originalCrypto = globalThis.crypto;

    afterEach(() => {
        vi.restoreAllMocks();
        vi.stubGlobal('crypto', originalCrypto);
    });

    describe('Primary path: crypto.randomUUID', () => {
        it('uses crypto.randomUUID when available', () => {
            const mockUUID = '12345678-1234-4234-8234-123456789abc';
            vi.stubGlobal('crypto', {
                randomUUID: vi.fn().mockReturnValue(mockUUID),
            });

            const uuid = generateUUID();
            expect(uuid).toBe(mockUUID);
            expect(crypto.randomUUID).toHaveBeenCalled();
        });

        it('returns valid UUID v4 string with default crypto.randomUUID environment', () => {
            const uuid = generateUUID();
            expect(uuid).toMatch(UUID_V4_REGEX);
        });

        it('generates unique UUIDs on consecutive calls', () => {
            const set = new Set<string>();
            for (let i = 0; i < 100; i++) {
                set.add(generateUUID());
            }
            expect(set.size).toBe(100);
        });
    });

    describe('Secondary path: crypto.getRandomValues fallback', () => {
        it('falls back to crypto.getRandomValues when crypto.randomUUID is not a function', () => {
            const mockGetRandomValues = vi.fn().mockImplementation((arr: Uint8Array) => {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = i * 16;
                }
                return arr;
            });

            vi.stubGlobal('crypto', {
                getRandomValues: mockGetRandomValues,
            });

            const uuid = generateUUID();
            expect(mockGetRandomValues).toHaveBeenCalled();
            expect(uuid).toMatch(UUID_V4_REGEX);
        });

        it('falls back to crypto.getRandomValues when crypto.randomUUID throws an error', () => {
            const mockGetRandomValues = vi.fn().mockImplementation((arr: Uint8Array) => {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] = (i + 1) * 10;
                }
                return arr;
            });

            vi.stubGlobal('crypto', {
                randomUUID: vi.fn().mockImplementation(() => {
                    throw new Error('Blocked by security policy');
                }),
                getRandomValues: mockGetRandomValues,
            });

            const uuid = generateUUID();
            expect(mockGetRandomValues).toHaveBeenCalled();
            expect(uuid).toMatch(UUID_V4_REGEX);
        });

        it('generates valid UUID v4 compliance bits (version 4, variant 10xx)', () => {
            const bytesContainer: Uint8Array[] = [];
            vi.stubGlobal('crypto', {
                getRandomValues: (arr: Uint8Array) => {
                    arr.fill(0xff);
                    bytesContainer.push(new Uint8Array(arr));
                    return arr;
                },
            });

            const uuid = generateUUID();
            expect(uuid).toMatch(UUID_V4_REGEX);
            // 7th byte (index 6 in hex string, i.e. char index 14) must be '4'
            expect(uuid[14]).toBe('4');
            // 9th byte (index 8 in hex string, i.e. char index 19) must be 8, 9, a, or b
            expect(['8', '9', 'a', 'b']).toContain(uuid[19].toLowerCase());
        });
    });

    describe('Tertiary path: Math.random fallback', () => {
        it('falls back to Math.random when crypto is undefined', () => {
            vi.stubGlobal('crypto', undefined);

            const uuid = generateUUID();
            expect(uuid).toMatch(UUID_V4_REGEX);
        });

        it('falls back to Math.random when crypto.getRandomValues throws', () => {
            vi.stubGlobal('crypto', {
                randomUUID: undefined,
                getRandomValues: vi.fn().mockImplementation(() => {
                    throw new Error('Not allowed');
                }),
            });

            const uuid = generateUUID();
            expect(uuid).toMatch(UUID_V4_REGEX);
        });

        it('generates unique UUIDs with Math.random fallback', () => {
            vi.stubGlobal('crypto', undefined);

            const set = new Set<string>();
            for (let i = 0; i < 100; i++) {
                set.add(generateUUID());
            }
            expect(set.size).toBe(100);
        });
    });
});
