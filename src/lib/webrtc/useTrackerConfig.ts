import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildAllTrackers,
  filterActiveTrackers,
  setTrackerPreference,
  usableBackendTrackerUrl,
} from './trackerLogic';
import { DEFAULT_PUBLIC_TRACKERS, type TrackerItem } from './trackerTypes';
import { storage, STORAGE_PREFIXES } from '../storage';

/** Persisted tracker configuration (custom URLs, per-URL enabled preferences) and its actions. */
export function useTrackerConfig(gameId: string) {
  const [trackerUrls, setTrackerUrls] = useState<string[]>(() => {
    return storage.getJson<string[]>(`${gameId}${STORAGE_PREFIXES.WEBRTC_TRACKER_URLS}`, []);
  });

  // Explicit user preferences per tracker URL (overriding default state)
  const [trackerPreferences, setTrackerPreferences] = useState<Record<string, boolean>>(() => {
    return storage.getJson<Record<string, boolean>>(
      `${gameId}${STORAGE_PREFIXES.WEBRTC_TRACKER_PREF}`,
      {},
    );
  });

  const [helperSettingsHash, setHelperSettingsHash] = useState(0);

  useEffect(() => {
    const handleSettingsUpdate = () => setHelperSettingsHash((h) => h + 1);
    window.addEventListener('melodiq_settings_updated', handleSettingsUpdate);
    window.addEventListener('server_connection_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('melodiq_settings_updated', handleSettingsUpdate);
      window.removeEventListener('server_connection_updated', handleSettingsUpdate);
    };
  }, []);

  // Self-hosted backend tracker URL if helper is enabled or custom signaling is configured;
  // null when this page cannot reach it (see usableBackendTrackerUrl)
  const backendTrackerUrl = useMemo(() => {
    return usableBackendTrackerUrl(storage.getSignalingUrl(), {
      isSecure: window.location.protocol === 'https:',
      hostname: window.location.hostname,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helperSettingsHash re-reads storage on settings events
  }, [helperSettingsHash]);

  // All available trackers with their classification and enabled/disabled status
  // When a custom backend is configured, free public trackers are deactivated by default per user request.
  const allTrackers = useMemo<TrackerItem[]>(() => {
    return buildAllTrackers({
      backendTrackerUrl,
      publicTrackers: DEFAULT_PUBLIC_TRACKERS,
      customTrackerUrls: trackerUrls,
      trackerPreferences,
    });
  }, [backendTrackerUrl, trackerPreferences, trackerUrls]);

  // Computed active tracker URLs: only those that are enabled
  const activeTrackerUrls = useMemo(() => filterActiveTrackers(allTrackers), [allTrackers]);

  const disabledTrackerUrls = useMemo(() => {
    return allTrackers.filter((t) => !t.enabled).map((t) => t.url);
  }, [allTrackers]);

  useEffect(() => {
    storage.setJson(`${gameId}${STORAGE_PREFIXES.WEBRTC_TRACKER_URLS}`, trackerUrls);
  }, [trackerUrls, gameId]);

  useEffect(() => {
    storage.setJson(`${gameId}${STORAGE_PREFIXES.WEBRTC_TRACKER_PREF}`, trackerPreferences);
  }, [trackerPreferences, gameId]);

  const toggleTrackerActive = useCallback(
    (url: string, enabled?: boolean) => {
      setTrackerPreferences((prev) => {
        const currentItem = allTrackers.find((t) => t.url === url);
        const currentEffective = currentItem ? currentItem.enabled : true;
        const newEnabled = enabled !== undefined ? enabled : !currentEffective;
        return setTrackerPreference(prev, url, newEnabled);
      });
    },
    [allTrackers],
  );

  const addTrackerUrl = useCallback(
    (url: string) => {
      const trimmed = url?.trim();
      if (!trimmed) return;
      setTrackerUrls((prev) => {
        if (
          !prev.includes(trimmed) &&
          !DEFAULT_PUBLIC_TRACKERS.includes(trimmed) &&
          trimmed !== backendTrackerUrl
        ) {
          return [...prev, trimmed];
        }
        return prev;
      });
      // Ensure added tracker is explicitly enabled
      setTrackerPreferences((prev) => setTrackerPreference(prev, trimmed, true));
    },
    [backendTrackerUrl],
  );

  const removeTrackerUrl = useCallback(
    (url: string) => {
      if (DEFAULT_PUBLIC_TRACKERS.includes(url) || url === backendTrackerUrl) {
        // Default public or backend tracker: deactivate instead of deleting
        toggleTrackerActive(url, false);
      } else {
        setTrackerUrls((prev) => prev.filter((t) => t !== url));
        setTrackerPreferences((prev) => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
      }
    },
    [backendTrackerUrl, toggleTrackerActive],
  );

  const restoreDefaultTrackers = useCallback(() => {
    setTrackerUrls([]);
    setTrackerPreferences({});
    storage.remove(`${gameId}${STORAGE_PREFIXES.WEBRTC_TRACKER_PREF}`);
    storage.remove(`${gameId}_disabled_tracker_urls`);
  }, [gameId]);

  return {
    trackerUrls,
    allTrackers,
    activeTrackerUrls,
    disabledTrackerUrls,
    toggleTrackerActive,
    addTrackerUrl,
    removeTrackerUrl,
    restoreDefaultTrackers,
  };
}
