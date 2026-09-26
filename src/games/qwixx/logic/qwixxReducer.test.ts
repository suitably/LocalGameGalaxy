import { describe, it, expect } from 'vitest';
import { canUncrossNumber } from './qwixxReducer';

describe('Qwixx Logic - canUncrossNumber', () => {
    it('returns false when the crossed array is empty', () => {
        expect(canUncrossNumber([], 5)).toBe(false);
    });

    it('returns true when the number is the last crossed number', () => {
        expect(canUncrossNumber([2, 3, 4], 4)).toBe(true);
    });

    it('returns false when the number is crossed but not the last one', () => {
        expect(canUncrossNumber([2, 3, 4], 3)).toBe(false);
    });

    it('returns false when the number is not in the crossed array', () => {
        expect(canUncrossNumber([2, 3, 4], 5)).toBe(false);
    });
});
