import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../../../lib/storage';

export interface TabletopCompanionState {
    serverUrl: string;
    isServerActive: boolean;
    directories: string[];
    scanning: boolean;
    gamesCount: number;
    tunnelActive: boolean;
    loading: boolean;
    actionLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    rescan: () => Promise<void>;
    addDirectory: (path: string) => Promise<void>;
    removeDirectory: (path: string) => Promise<void>;
}

export function useTabletopCompanion(): TabletopCompanionState {
    const [serverUrl, setServerUrl] = useState(() => storage.getHelperUrl());
    const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
    const [directories, setDirectories] = useState<string[]>([]);
    const [scanning, setScanning] = useState(false);
    const [gamesCount, setGamesCount] = useState(0);
    const [tunnelActive, setTunnelActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
        const token = storage.getHelperToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers,
        });
    }, []);

    const loadData = useCallback(async () => {
        if (!storage.isHelperActive()) {
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const [statusRes, configRes] = await Promise.allSettled([
                fetchWithAuth('/api/tabletop/status'),
                fetchWithAuth('/api/tabletop/config'),
            ]);

            if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
                const statusData = await statusRes.value.json();
                setScanning(Boolean(statusData.scanning ?? statusData.isScanning));
                setGamesCount(
                    Number(statusData.gamesCount ?? statusData.gameCount ?? statusData.games ?? statusData.totalGames ?? 0)
                );
                setTunnelActive(Boolean(statusData.tunnelActive ?? statusData.isTunnelActive ?? statusData.tunnelUrl));
            }

            if (configRes.status === 'fulfilled' && configRes.value.ok) {
                const configData = await configRes.value.json();
                const dirs = Array.isArray(configData) ? configData : configData?.directories || [];
                setDirectories(dirs);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden des Tabletop-Servers');
        } finally {
            setLoading(false);
        }
    }, [fetchWithAuth]);

    useEffect(() => {
        const handleUpdate = () => {
            setServerUrl(storage.getHelperUrl());
            const active = storage.isHelperActive();
            setIsServerActive(active);
            if (active) {
                loadData();
            }
        };

        handleUpdate();
        window.addEventListener('server_connection_updated', handleUpdate);
        return () => window.removeEventListener('server_connection_updated', handleUpdate);
    }, [loadData]);

    const addDirectory = useCallback(async (dirPath: string) => {
        const trimmed = dirPath.trim();
        if (!trimmed) return;
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth('/api/tabletop/config/directories', {
                method: 'POST',
                body: JSON.stringify({ directory: trimmed, path: trimmed }),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json().catch(() => null);
            if (data && (Array.isArray(data) || data.directories)) {
                setDirectories(Array.isArray(data) ? data : data.directories);
            } else {
                await loadData();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Verzeichnis konnte nicht hinzugefügt werden');
        } finally {
            setActionLoading(false);
        }
    }, [fetchWithAuth, loadData]);

    const removeDirectory = useCallback(async (dirPath: string) => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth('/api/tabletop/config/directories', {
                method: 'DELETE',
                body: JSON.stringify({ directory: dirPath, path: dirPath }),
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json().catch(() => null);
            if (data && (Array.isArray(data) || data.directories)) {
                setDirectories(Array.isArray(data) ? data : data.directories);
            } else {
                await loadData();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Verzeichnis konnte nicht entfernt werden');
        } finally {
            setActionLoading(false);
        }
    }, [fetchWithAuth, loadData]);

    const rescan = useCallback(async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetchWithAuth('/api/tabletop/games/refresh', {
                method: 'POST',
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            await loadData();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Rescan fehlgeschlagen');
        } finally {
            setActionLoading(false);
        }
    }, [fetchWithAuth, loadData]);

    return {
        serverUrl,
        isServerActive,
        directories,
        scanning,
        gamesCount,
        tunnelActive,
        loading,
        actionLoading,
        error,
        refresh: loadData,
        rescan,
        addDirectory,
        removeDirectory,
    };
}
