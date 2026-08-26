import { useEffect } from 'react';

export type ScreenOrientationType = 'portrait' | 'landscape' | 'any';

/**
 * Hook to lock or request a specific screen orientation on supported mobile devices.
 * Gracefully ignores unsupported platforms or permission restrictions.
 *
 * @param orientation - 'portrait' | 'landscape' | 'any'
 */
export function useScreenOrientation(orientation?: ScreenOrientationType) {
    useEffect(() => {
        if (!orientation || orientation === 'any') return;

        const lockOrientation = async () => {
            try {
                if (window.screen?.orientation && 'lock' in window.screen.orientation) {
                    const type = orientation === 'landscape' ? 'landscape' : 'portrait-primary';
                    await (window.screen.orientation as any).lock(type);
                }
            } catch (err: any) {
                // Screen orientation lock requires fullscreen or user engagement on standard web
                console.debug('[useScreenOrientation] Orientation lock skipped/unsupported:', err.message);
            }
        };

        lockOrientation();

        return () => {
            try {
                if (window.screen?.orientation && 'unlock' in window.screen.orientation) {
                    (window.screen.orientation as any).unlock();
                }
            } catch {}
        };
    }, [orientation]);
}
