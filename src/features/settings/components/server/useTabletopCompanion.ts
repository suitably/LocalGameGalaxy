import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from '../../../../lib/storage';
import { companionRequest, jsonBody } from '../../../../lib/companion/companionHttp';

/** Shape of `GET /api/tabletop/status` (see server/src/plugins/tabletop/routes/games.ts). */
export interface TabletopStatusResponse {
  scanning?: boolean;
  gameCount?: number;
  publicUrl?: string | null;
}

type DirectoriesResponse = string[] | { directories?: string[] } | null;

/** Maps the status response to UI state; the tunnel is active when the server reports a `publicUrl`. */
export function mapTabletopStatus(status: TabletopStatusResponse | null | undefined) {
  return {
    scanning: Boolean(status?.scanning),
    gamesCount: Number(status?.gameCount ?? 0),
    tunnelActive: Boolean(status?.publicUrl),
  };
}

const directoriesOf = (data: DirectoriesResponse): string[] | null =>
  Array.isArray(data) ? data : (data?.directories ?? null);

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
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState(() => storage.getHelperUrl());
  const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
  const [directories, setDirectories] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [gamesCount, setGamesCount] = useState(0);
  const [tunnelActive, setTunnelActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!storage.isHelperActive()) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [statusRes, configRes] = await Promise.allSettled([
        companionRequest<TabletopStatusResponse>('/api/tabletop/status'),
        companionRequest<DirectoriesResponse>('/api/tabletop/config'),
      ]);

      if (statusRes.status === 'fulfilled') {
        const mapped = mapTabletopStatus(statusRes.value);
        setScanning(mapped.scanning);
        setGamesCount(mapped.gamesCount);
        setTunnelActive(mapped.tunnelActive);
      }

      if (configRes.status === 'fulfilled') {
        setDirectories(directoriesOf(configRes.value) ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('settings.companion_tabletop_error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const addDirectory = useCallback(
    async (dirPath: string) => {
      const trimmed = dirPath.trim();
      if (!trimmed) return;
      setActionLoading(true);
      setError(null);
      try {
        const data = await companionRequest<DirectoriesResponse>(
          '/api/tabletop/config/directories',
          jsonBody('POST', { directory: trimmed, path: trimmed }),
        );
        const dirs = directoriesOf(data);
        if (dirs) {
          setDirectories(dirs);
        } else {
          await loadData();
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : t('settings.companion_tabletop_error_add_dir'),
        );
      } finally {
        setActionLoading(false);
      }
    },
    [loadData, t],
  );

  const removeDirectory = useCallback(
    async (dirPath: string) => {
      setActionLoading(true);
      setError(null);
      try {
        const data = await companionRequest<DirectoriesResponse>(
          '/api/tabletop/config/directories',
          jsonBody('DELETE', { directory: dirPath, path: dirPath }),
        );
        const dirs = directoriesOf(data);
        if (dirs) {
          setDirectories(dirs);
        } else {
          await loadData();
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : t('settings.companion_tabletop_error_remove_dir'),
        );
      } finally {
        setActionLoading(false);
      }
    },
    [loadData, t],
  );

  const rescan = useCallback(async () => {
    setActionLoading(true);
    setError(null);
    try {
      await companionRequest('/api/tabletop/games/refresh', { method: 'POST' });
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('settings.companion_tabletop_error_rescan'));
    } finally {
      setActionLoading(false);
    }
  }, [loadData, t]);

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
