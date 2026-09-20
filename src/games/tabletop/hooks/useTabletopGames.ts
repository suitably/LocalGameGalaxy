/**
 * Hook for managing Tabletop games via BYOG server or local File System API [ID: HOOK-TABLETOP-GAMES]
 */
import { useState, useEffect, useCallback } from 'react';
import { storage } from '../../../lib/storage';
import { parsePcioFile } from '../logic/pcioParser';
import { pickAndLoadGameFolder, supportsLocalFolderImport } from '../logic/localFolderImport';
import type { TabletopGameDefinition, TabletopGameSummary } from '../logic/types';

interface ServerGameEntry {
  id: string;
  name: string;
  author?: string;
  description?: string;
  widgetCount: number;
  cardCount: number;
  format?: 'flat-json' | 'pcio-folder' | 'unknown';
  updatedAt: number;
}

interface TabletopRawResponse {
  id: string;
  rawJson: string;
  assetMap: Record<string, string>;
}

export function useTabletopGames() {
  const [games, setGames] = useState<TabletopGameSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [supportsLocalFolder] = useState<boolean>(() => supportsLocalFolderImport());

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
      const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
      const token = storage.getHelperToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/tabletop/games`, { headers });
      if (!res.ok) {
        setServerConnected(false);
        if (res.status === 401) {
          setError('Ungültiger oder fehlender Server-Token');
        } else {
          setError(`Serverfehler: HTTP ${res.status}`);
        }
        return;
      }

      const rawList = (await res.json()) as ServerGameEntry[];
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
      }));

      setGames(summaries);
      setServerConnected(true);
      setError(null);
    } catch (err: unknown) {
      setServerConnected(false);
      setError(err instanceof Error ? err.message : 'Server nicht erreichbar');
    } finally {
      setLoading(false);
    }
  }, []);

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
    async (id: string): Promise<TabletopGameDefinition> => {
      const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
      const token = storage.getHelperToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/tabletop/games/${encodeURIComponent(id)}/raw`, {
        headers,
      });

      if (!res.ok) {
        throw new Error(`Konnte Spiel nicht vom Server laden (HTTP ${res.status})`);
      }

      const data = (await res.json()) as TabletopRawResponse;
      return parsePcioFile(data.rawJson, { assetFiles: data.assetMap });
    },
    [],
  );

  const pickLocalFolder = useCallback(async (): Promise<TabletopGameDefinition> => {
    return pickAndLoadGameFolder();
  }, []);

  const refresh = useCallback(async () => {
    if (storage.isHelperActive()) {
      try {
        const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
        const token = storage.getHelperToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        await fetch(`${baseUrl}/api/tabletop/games/refresh`, {
          method: 'POST',
          headers,
        });
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
