import { useEffect } from 'react';

export type ScreenOrientationType = 'portrait' | 'landscape' | 'any';

/** `lock`/`unlock` are missing from some lib.dom versions of `ScreenOrientation`. */
interface LockableScreenOrientation {
    lock(orientation: 'landscape' | 'portrait-primary'): Promise<void>;
    unlock(): void;
}

const isLockable = (
    orientation: ScreenOrientation | undefined,
): orientation is ScreenOrientation & LockableScreenOrientation =>
    !!orientation && 'lock' in orientation && 'unlock' in orientation;

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
                const screenOrientation = window.screen?.orientation;
                if (isLockable(screenOrientation)) {
                    const type = orientation === 'landscape' ? 'landscape' : 'portrait-primary';
                    await screenOrientation.lock(type);
                }
            } catch (err) {
                const error = err as { name?: string; message?: string } | null;
                // Screen orientation lock requires fullscreen or mobile environment on standard web
                if (error?.name !== 'SecurityError' && error?.name !== 'NotSupportedError') {
                    console.debug('[useScreenOrientation] Orientation lock skipped/unsupported:', error?.message);
                }
            }
        };

        lockOrientation();

        return () => {
            try {
                const screenOrientation = window.screen?.orientation;
                if (isLockable(screenOrientation)) {
                    screenOrientation.unlock();
                }
            } catch {
                // unlock() is best-effort and throws on browsers without orientation lock
            }
        };
    }, [orientation]);
}
