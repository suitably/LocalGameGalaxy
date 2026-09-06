import { describe, it, expect } from 'vitest';
import {
    buildAllTrackers,
    filterActiveTrackers,
    setTrackerPreference,
    isTrackerEnabledByDefault
} from './trackerLogic';
import { DEFAULT_PUBLIC_TRACKERS } from './WebRTCHostContext';

describe('WebRTC Tracker Logic', () => {
    it('isTrackerEnabledByDefault respects backend presence', () => {
        // Without backend: public trackers enabled by default
        expect(isTrackerEnabledByDefault('public', false)).toBe(true);
        expect(isTrackerEnabledByDefault('backend', false)).toBe(true);
        expect(isTrackerEnabledByDefault('custom', false)).toBe(true);

        // With backend: public trackers disabled by default, backend enabled
        expect(isTrackerEnabledByDefault('public', true)).toBe(false);
        expect(isTrackerEnabledByDefault('backend', true)).toBe(true);
        expect(isTrackerEnabledByDefault('custom', true)).toBe(true);
    });

    it('includes default free public trackers as active when NO backend is configured', () => {
        const trackers = buildAllTrackers({
            backendTrackerUrl: null
        });

        expect(trackers).toHaveLength(DEFAULT_PUBLIC_TRACKERS.length);
        DEFAULT_PUBLIC_TRACKERS.forEach(url => {
            const match = trackers.find(t => t.url === url);
            expect(match).toBeDefined();
            expect(match?.type).toBe('public');
            expect(match?.enabled).toBe(true);
        });

        const activeUrls = filterActiveTrackers(trackers);
        expect(activeUrls).toEqual(DEFAULT_PUBLIC_TRACKERS);
    });

    it('when backend is configured, keeps free trackers visible in list but DEACTIVATED by default', () => {
        const backendUrl = 'ws://192.168.1.50:3000';
        const trackers = buildAllTrackers({
            backendTrackerUrl: backendUrl
        });

        // Backend tracker is present and enabled
        const backendMatch = trackers.find(t => t.url === backendUrl);
        expect(backendMatch).toBeDefined();
        expect(backendMatch?.type).toBe('backend');
        expect(backendMatch?.enabled).toBe(true);

        // Free public trackers must NOT fall out: they must still be in the list!
        DEFAULT_PUBLIC_TRACKERS.forEach(url => {
            const match = trackers.find(t => t.url === url);
            expect(match).toBeDefined();
            expect(match?.type).toBe('public');
            // BUT they must be deactivated (disabled) by default per user requirement!
            expect(match?.enabled).toBe(false);
        });

        // Only backend tracker is active by default
        const activeUrls = filterActiveTrackers(trackers);
        expect(activeUrls).toEqual([backendUrl]);
    });

    it('allows user to explicitly activate free public trackers even when backend is configured', () => {
        const backendUrl = 'ws://192.168.1.50:3000';
        const publicToEnable = DEFAULT_PUBLIC_TRACKERS[0];

        // User toggles public tracker to true
        const prefs = setTrackerPreference({}, publicToEnable, true);

        const trackers = buildAllTrackers({
            backendTrackerUrl: backendUrl,
            trackerPreferences: prefs
        });

        const publicMatch = trackers.find(t => t.url === publicToEnable);
        expect(publicMatch?.enabled).toBe(true);

        const otherPublic = trackers.find(t => t.url === DEFAULT_PUBLIC_TRACKERS[1]);
        expect(otherPublic?.enabled).toBe(false);

        const activeUrls = filterActiveTrackers(trackers);
        expect(activeUrls).toContain(backendUrl);
        expect(activeUrls).toContain(publicToEnable);
        expect(activeUrls).not.toContain(DEFAULT_PUBLIC_TRACKERS[1]);
    });

    it('allows deactivating free public trackers when NO backend is configured', () => {
        const targetToDisable = DEFAULT_PUBLIC_TRACKERS[0];
        const prefs = setTrackerPreference({}, targetToDisable, false);

        const trackers = buildAllTrackers({
            backendTrackerUrl: null,
            trackerPreferences: prefs
        });

        const disabledMatch = trackers.find(t => t.url === targetToDisable);
        expect(disabledMatch?.enabled).toBe(false);

        const activeUrls = filterActiveTrackers(trackers);
        expect(activeUrls).not.toContain(targetToDisable);
        expect(activeUrls).toHaveLength(DEFAULT_PUBLIC_TRACKERS.length - 1);
    });

    it('supports custom user-added trackers', () => {
        const backendUrl = 'ws://10.0.0.5:3000';
        const customUrl = 'wss://custom-tracker.example.com';

        const trackers = buildAllTrackers({
            backendTrackerUrl: backendUrl,
            customTrackerUrls: [customUrl]
        });

        const customMatch = trackers.find(t => t.url === customUrl);
        expect(customMatch).toBeDefined();
        expect(customMatch?.type).toBe('custom');
        expect(customMatch?.enabled).toBe(true);

        const activeUrls = filterActiveTrackers(trackers);
        expect(activeUrls).toContain(customUrl);
        expect(activeUrls).toContain(backendUrl);
        // Public trackers are inactive by default
        DEFAULT_PUBLIC_TRACKERS.forEach(url => {
            expect(activeUrls).not.toContain(url);
        });
    });
});
