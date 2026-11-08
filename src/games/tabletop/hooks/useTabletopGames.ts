/**
 * Hook for managing Tabletop games via BYOG server or local File System API [ID: HOOK-TABLETOP-GAMES]
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { storage } from '../../../lib/storage';
import { companionRequest } from '../../../lib/companion/companionHttp';
import { loadServerGame, type ServerGameEntry } from '../logic/tabletopServerApi';
import { pickAndLoadGameFolder, supportsLocalFolderImport } from '../logic/localFolderImport';
import type { TabletopGameDefinition, TabletopGameSummary } from '../logic/types';

export function useTabletopGames() {
  const { t } = useTranslation();
  const [games, setGames] = useState<TabletopGameSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [supportsLocalFolder] = useState<boolean>(() => supportsLocalFolderImport());

  /** HTTP failures get a localised text; browser network errors stay raw (see isServerUnreachable). */
  const describeError = useCallback(
    (err: unknown): string => {
      const message = err instanceof Error ? err.message : '';
      const status = /^HTTP (\d+)$/.exec(message)?.[1];
      if (status === '401') return t('games.tabletop.error_invalid_token');
      if (status) return t('games.tabletop.error_server_http', { status });
      return message || t('games.tabletop.error_server_unreachable');
    },
    [t],
  );

  const fetchGames = useCallback(async () => {
    if (!storage.isHelperActive()) {
      setServerConnected(false);
      setGames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rawList = await companionRequest<ServerGameEntry[]>('/api/tabletop/games');
      const summaries: TabletopGameSummary[] = rawList.map((entry) => ({
        id: entry.id,
        name: entry.name,
        description: entry.description,
        author: entry.author,
        version: '1.0.0',
        minPlayers: 1,
        maxPlayers: 8,
        supportedModes: ['party_multi_device', 'local_pass_and_play', 'solo'],
        cardCount: entry.cardCount ?? 0,
        widgetCount: entry.widgetCount ?? 0,
        format: entry.format,
        updatedAt: entry.updatedAt ?? Date.now(),
        serverSaved: entry.saved === true,
      }));

      setGames(summaries);
      setServerConnected(true);
      setError(null);
    } catch (err: unknown) {
      setServerConnected(false);
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [describeError]);

  useEffect(() => {
    fetchGames();

    const handleUpdate = () => {
      fetchGames();
    };

    window.addEventListener('server_connection_updated', handleUpdate);
    return () => {
      window.removeEventListener('server_connection_updated', handleUpdate);
    };
  }, [fetchGames]);

  const loadGameFromServer = useCallback(
    (id: string): Promise<TabletopGameDefinition> => loadServerGame(id),
    [],
  );

  const pickLocalFolder = useCallback(async (): Promise<TabletopGameDefinition> => {
    return pickAndLoadGameFolder();
  }, []);

  const refresh = useCallback(async () => {
    if (storage.isHelperActive()) {
      try {
        await companionRequest('/api/tabletop/games/refresh', { method: 'POST' });
      } catch (err) {
        console.warn('[useTabletopGames] Rescan trigger failed:', err);
      }
    }
    await fetchGames();
  }, [fetchGames]);

  return {
    games,
    loading,
    error,
    serverConnected,
    supportsLocalFolder,
    loadGameFromServer,
    pickLocalFolder,
    refresh,
  };
}
