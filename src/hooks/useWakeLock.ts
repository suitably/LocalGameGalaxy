import { useEffect, useRef } from 'react';

/**
 * Hook to request and maintain a Screen WakeLock to prevent device screen sleep.
 * Automatically re-acquires the lock when the page becomes visible again.
 *
 * @param enabled - Whether the screen lock should be active.
 */
export function useWakeLock(enabled: boolean = true) {
    const sentinelRef = useRef<any>(null);

    useEffect(() => {
        if (!enabled) {
            if (sentinelRef.current) {
                sentinelRef.current.release().catch(() => {});
                sentinelRef.current = null;
            }
            return;
        }

        let isMounted = true;

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && !sentinelRef.current) {
                try {
                    const lock = await (navigator as any).wakeLock.request('screen');
                    if (isMounted) {
                        sentinelRef.current = lock;
                        lock.addEventListener('release', () => {
                            sentinelRef.current = null;
                        });
                    } else {
                        lock.release().catch(() => {});
                    }
                } catch (err: any) {
                    // Wake lock can fail if battery is low or system policy forbids it
                    console.debug('[useWakeLock] Failed to acquire wake lock:', err.message);
                }
            }
        };

        requestWakeLock();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && enabled && !sentinelRef.current) {
                requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (sentinelRef.current) {
                sentinelRef.current.release().catch(() => {});
                sentinelRef.current = null;
            }
        };
    }, [enabled]);
}
