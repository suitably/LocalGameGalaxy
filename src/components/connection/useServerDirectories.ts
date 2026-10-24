import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from '../../lib/storage';
import { melodiqFetch } from '../../games/melodiq';
import type { DownloadDirResponse } from './serverConfigTypes';

type DirectoriesResponse = string[] | { directories?: string[] };

const toList = (res: DirectoriesResponse | undefined): string[] =>
  Array.isArray(res) ? res : res?.directories || [];

/** Library directories and the download directory of the companion server. */
export function useServerDirectories() {
  const { t } = useTranslation();
  const [isServerActive, setIsServerActive] = useState(() => storage.isHelperActive());
  const [directories, setDirectories] = useState<string[]>([]);
  const [downloadDir, setDownloadDir] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = useCallback(
    (err: unknown, key: string, fallback: string) =>
      setError(err instanceof Error ? err.message : t(key, fallback)),
    [t],
  );

  const loadData = useCallback(async () => {
    if (!storage.isHelperActive()) return;
    setLoading(true);
    setError(null);
    try {
      const [dirsRes, downloadRes] = await Promise.all([
        melodiqFetch<DirectoriesResponse>('/api/config/directories'),
        melodiqFetch<DownloadDirResponse>('/api/config/download-dir'),
      ]);
      setDirectories(toList(dirsRes));
      setDownloadDir(downloadRes?.downloadDir || null);
    } catch (err: unknown) {
      fail(err, 'server.directories.error_load', 'Failed to load directories');
    } finally {
      setLoading(false);
    }
  }, [fail]);

  useEffect(() => {
    const handleUpdate = () => {
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

  const changeDirectory = async (
    method: 'POST' | 'DELETE',
    path: string,
    errorKey: string,
    fallback: string,
  ) => {
    try {
      setError(null);
      const res = await melodiqFetch<DirectoriesResponse>('/api/config/directories', {
        method,
        body: JSON.stringify({ path }),
      });
      setDirectories(toList(res));
    } catch (err: unknown) {
      fail(err, errorKey, fallback);
    }
  };

  const addDirectory = (path: string) =>
    changeDirectory('POST', path, 'server.directories.error_add', 'Failed to add directory');

  const removeDirectory = (path: string) =>
    changeDirectory(
      'DELETE',
      path,
      'server.directories.error_remove',
      'Failed to remove directory',
    );

  const setDownloadDirectory = async (selectedPath: string) => {
    try {
      setError(null);
      const res = await melodiqFetch<DownloadDirResponse>('/api/config/download-dir', {
        method: 'POST',
        body: JSON.stringify({ dir: selectedPath, path: selectedPath }),
      });
      setDownloadDir(res?.downloadDir || selectedPath);
    } catch (err: unknown) {
      fail(err, 'server.directories.error_set_download', 'Failed to set download directory');
    }
  };

  return {
    isServerActive,
    directories,
    downloadDir,
    loading,
    error,
    addDirectory,
    removeDirectory,
    setDownloadDirectory,
  };
}
