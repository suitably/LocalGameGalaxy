import { describe, it, expect, vi } from 'vitest';
import { isUsdbLoginRequiredError, navigateToUsdbSettings } from './usdbNavigation';

describe('usdbNavigation', () => {
    describe('isUsdbLoginRequiredError', () => {
        it('detects standard USDB login required error message', () => {
            const err = new Error('USDB requires login to search. Please save your credentials above.');
            expect(isUsdbLoginRequiredError(err)).toBe(true);
        });

        it('detects USDB login failed error message', () => {
            const err = new Error('USDB login failed. Please check your credentials.');
            expect(isUsdbLoginRequiredError(err)).toBe(true);
        });

        it('detects string errors', () => {
            expect(isUsdbLoginRequiredError('USDB requires login to search.')).toBe(true);
        });

        it('returns false for unrelated errors', () => {
            expect(isUsdbLoginRequiredError(new Error('Network disconnected'))).toBe(false);
            expect(isUsdbLoginRequiredError(new Error('USDB search HTTP 500'))).toBe(false);
            expect(isUsdbLoginRequiredError(null)).toBe(false);
            expect(isUsdbLoginRequiredError(undefined)).toBe(false);
        });
    });

    describe('navigateToUsdbSettings', () => {
        it('calls navigate with expected query params and from state', () => {
            const navigate = vi.fn();
            const location = { pathname: '/games/melodiq', search: '?view=home' };

            navigateToUsdbSettings(navigate as any, location);

            expect(navigate).toHaveBeenCalledWith(
                '/settings?tab=melodiq&sub=server&section=usdb&missing_usdb=1',
                {
                    state: { from: '/games/melodiq?view=home' }
                }
            );
        });

        it('falls back to default from path when location is not passed', () => {
            const navigate = vi.fn();

            navigateToUsdbSettings(navigate as any);

            expect(navigate).toHaveBeenCalledWith(
                '/settings?tab=melodiq&sub=server&section=usdb&missing_usdb=1',
                {
                    state: { from: '/games/melodiq' }
                }
            );
        });
    });
});
