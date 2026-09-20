import { useState, useMemo, useCallback, useEffect } from 'react';
import { storage } from '../../../../lib/storage';
import {
    buildAllTrackers,
    filterActiveTrackers,
    setTrackerPreference,
} from '../../../../lib/webrtc/trackerLogic';
import { DEFAULT_PUBLIC_TRACKERS, type TrackerItem } from '../../../../lib/webrtc';

export type SignalingHealthStatus = 'idle' | 'checking' | 'online' | 'offline';

export function useSignalingTrackerState() {
    const [customSignalingUrl, setCustomSignalingUrl] = useState(() => storage.getSignalingUrl());
    const [healthStatus, setHealthStatus] = useState<SignalingHealthStatus>('idle');
    const [healthDetails, setHealthDetails] = useState('');

    const [trackerUrls, setTrackerUrls] = useState<string[]>(() => {
        return storage.getJson<string[]>('global_tracker_urls', []);
    });

    const [trackerPreferences, setTrackerPreferences] = useState<Record<string, boolean>>(() => {
        return storage.getJson<Record<string, boolean>>('global_tracker_preferences', {});
    });

    const backendTrackerUrl = useMemo(() => {
        return storage.getSignalingUrl() || null;
    }, [customSignalingUrl]);

    const allTrackers = useMemo<TrackerItem[]>(() => {
        return buildAllTrackers({
            backendTrackerUrl,
            publicTrackers: DEFAULT_PUBLIC_TRACKERS,
            customTrackerUrls: trackerUrls,
            trackerPreferences,
        });
    }, [backendTrackerUrl, trackerUrls, trackerPreferences]);

    const activeTrackerUrls = useMemo(() => {
        return filterActiveTrackers(allTrackers);
    }, [allTrackers]);

    const handleSignalingUrlChange = useCallback((url: string) => {
        setCustomSignalingUrl(url);
        storage.setSignalingUrl(url.trim());
        setHealthStatus('idle');
        window.dispatchEvent(new Event('server_connection_updated'));
    }, []);

    const toggleTrackerActive = useCallback((url: string, enabled?: boolean) => {
        const target = allTrackers.find(t => t.url === url);
        const newActive = enabled !== undefined ? enabled : !target?.enabled;
        setTrackerPreferences(prev => {
            const next = setTrackerPreference(prev, url, newActive);
            storage.setJson('global_tracker_preferences', next);
            return next;
        });
    }, [allTrackers]);

    const addTrackerUrl = useCallback((url: string) => {
        const trimmed = url.trim();
        if (!trimmed || trackerUrls.includes(trimmed)) return;
        const next = [...trackerUrls, trimmed];
        setTrackerUrls(next);
        storage.setJson('global_tracker_urls', next);
    }, [trackerUrls]);

    const removeTrackerUrl = useCallback((url: string) => {
        const next = trackerUrls.filter(u => u !== url);
        setTrackerUrls(next);
        storage.setJson('global_tracker_urls', next);
    }, [trackerUrls]);

    const restoreDefaultTrackers = useCallback(() => {
        setTrackerUrls([]);
        setTrackerPreferences({});
        storage.remove('global_tracker_urls');
        storage.remove('global_tracker_preferences');
    }, []);

    const checkSignalingHealth = useCallback(async () => {
        const rawUrl = storage.getSignalingUrl() || 'ws://localhost:8000';
        setHealthStatus('checking');
        setHealthDetails('Prüfe Status...');

        try {
            const parsed = new URL(rawUrl.replace(/^wss?:/i, 'http:'));
            const healthUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}/health`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(healthUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                setHealthStatus('online');
                setHealthDetails(data.service ? `${data.service} (Uptime: ${data.uptime || 0}s)` : 'Online');
            } else {
                setHealthStatus('offline');
                setHealthDetails(`HTTP ${res.status}`);
            }
        } catch {
            setHealthStatus('offline');
            setHealthDetails('Keine Antwort (Server offline oder nicht erreichbar)');
        }
    }, []);

    // Initial silent check on mount
    useEffect(() => {
        void checkSignalingHealth();
    }, [checkSignalingHealth]);

    return {
        customSignalingUrl,
        handleSignalingUrlChange,
        healthStatus,
        healthDetails,
        checkSignalingHealth,
        allTrackers,
        activeTrackerUrls,
        trackerUrls,
        toggleTrackerActive,
        addTrackerUrl,
        removeTrackerUrl,
        restoreDefaultTrackers,
    };
}
