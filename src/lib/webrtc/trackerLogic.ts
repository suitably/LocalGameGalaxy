import { DEFAULT_PUBLIC_TRACKERS, type TrackerItem } from './WebRTCHostContext';

export interface ResolveTrackersOptions {
    backendTrackerUrl?: string | null;
    publicTrackers?: readonly string[];
    customTrackerUrls?: string[];
    trackerPreferences?: Record<string, boolean>;
}

/**
 * Determines whether a tracker type is enabled by default.
 *
 * Rules:
 * - Backend tracker: enabled by default.
 * - Custom user trackers: enabled by default.
 * - Free / Public trackers:
 *     - If NO custom backend is configured: ENABLED by default (as standard fallback).
 *     - If a custom backend IS configured: DEACTIVATED by default (user's self-hosted backend takes priority,
 *       but public trackers remain in the list so the user can easily toggle them on as needed).
 */
export function isTrackerEnabledByDefault(
    type: 'backend' | 'public' | 'custom',
    hasBackend: boolean
): boolean {
    if (type === 'backend') return true;
    if (type === 'custom') return true;
    return !hasBackend;
}

/**
 * Builds the complete list of available trackers with their classification
 * (backend, public, custom) and active state.
 *
 * Ensures:
 * 1. Default free public trackers are included by default.
 * 2. Configuring a custom backend does NOT discard public trackers from the list.
 * 3. When a backend is configured, free public trackers are deactivated by default.
 * 4. User can explicitly toggle any tracker on or off, which persists in trackerPreferences.
 */
export function buildAllTrackers({
    backendTrackerUrl = null,
    publicTrackers = DEFAULT_PUBLIC_TRACKERS,
    customTrackerUrls = [],
    trackerPreferences = {}
}: ResolveTrackersOptions): TrackerItem[] {
    const items: TrackerItem[] = [];
    const hasBackend = Boolean(backendTrackerUrl);

    // 1. Self-hosted backend tracker (from configured companion server)
    if (backendTrackerUrl) {
        const isEnabled = trackerPreferences[backendTrackerUrl] !== undefined
            ? trackerPreferences[backendTrackerUrl]
            : isTrackerEnabledByDefault('backend', hasBackend);
        items.push({
            url: backendTrackerUrl,
            type: 'backend',
            enabled: isEnabled
        });
    }

    // 2. Default free public fallback trackers (remain listed; deactivated by default if backend configured)
    publicTrackers.forEach(url => {
        if (!items.some(it => it.url === url)) {
            const isEnabled = trackerPreferences[url] !== undefined
                ? trackerPreferences[url]
                : isTrackerEnabledByDefault('public', hasBackend);
            items.push({
                url,
                type: 'public',
                enabled: isEnabled
            });
        }
    });

    // 3. Custom user-added trackers
    customTrackerUrls.forEach(url => {
        if (!items.some(it => it.url === url)) {
            const isEnabled = trackerPreferences[url] !== undefined
                ? trackerPreferences[url]
                : isTrackerEnabledByDefault('custom', hasBackend);
            items.push({
                url,
                type: 'custom',
                enabled: isEnabled
            });
        }
    });

    return items;
}

/**
 * Returns only the URLs of currently active (enabled) trackers.
 */
export function filterActiveTrackers(trackers: TrackerItem[]): string[] {
    return trackers.filter(t => t.enabled).map(t => t.url);
}

/**
 * Updates tracker preferences for a specific URL.
 */
export function setTrackerPreference(
    preferences: Record<string, boolean>,
    targetUrl: string,
    enabled: boolean
): Record<string, boolean> {
    return {
        ...preferences,
        [targetUrl]: enabled
    };
}
