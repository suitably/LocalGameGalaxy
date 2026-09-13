/**
 * Hook for managing installed and custom Tabletop games [ID: HOOK-TABLETOP-GAMES]
 */
import { useState, useEffect, useCallback } from 'react';
import type { TabletopGameDefinition, TabletopGameSummary } from '../logic/types';
import {
  saveTabletopGame,
  getTabletopGame,
  listTabletopGames,
  deleteTabletopGame,
} from '../logic/tabletopStorage';
import { parsePcioFile } from '../logic/pcioParser';
import { exportGameAsJson, exportGameAsPcio } from '../logic/tabletopExporter';
import { fetchAndParseGameUrl, fetchCatalogGame, fetchManifest } from '../logic/gameInstaller';

export function useTabletopGames() {
  const [games, setGames] = useState<TabletopGameSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importError, setImportError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listTabletopGames();
      setGames(list);
    } catch (err) {
      console.error('[useTabletopGames] Failed to list games:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const importFile = useCallback(
    async (file: File): Promise<TabletopGameDefinition> => {
      setImportError(null);
      try {
        let gameDef: TabletopGameDefinition;
        if (file.name.toLowerCase().endsWith('.json')) {
          const text = await file.text();
          gameDef = await parsePcioFile(text);
        } else {
          const buffer = await file.arrayBuffer();
          gameDef = await parsePcioFile(buffer);
        }

        await saveTabletopGame(gameDef);
        await refresh();
        return gameDef;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const saveGame = useCallback(
    async (game: TabletopGameDefinition) => {
      await saveTabletopGame(game);
      await refresh();
    },
    [refresh],
  );

  const removeGame = useCallback(
    async (id: string) => {
      await deleteTabletopGame(id);
      await refresh();
    },
    [refresh],
  );

  const loadGame = useCallback(async (id: string): Promise<TabletopGameDefinition | null> => {
    return getTabletopGame(id);
  }, []);

  const importFromUrl = useCallback(
    async (url: string): Promise<TabletopGameDefinition> => {
      setImportError(null);
      try {
        const gameDef = await fetchAndParseGameUrl(url);
        await saveTabletopGame(gameDef);
        await refresh();
        return gameDef;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const installCatalogGame = useCallback(
    async (filePath: string): Promise<TabletopGameDefinition> => {
      setImportError(null);
      try {
        const gameDef = await fetchCatalogGame(filePath);
        await saveTabletopGame(gameDef);
        await refresh();
        return gameDef;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportError(msg);
        throw err;
      }
    },
    [refresh],
  );

  const installStarterPack = useCallback(async (): Promise<number> => {
    setImportError(null);
    try {
      const manifestList = await fetchManifest();
      let count = 0;
      for (const item of manifestList) {
        try {
          const def = await fetchCatalogGame(item.file);
          await saveTabletopGame(def);
          count++;
        } catch (e) {
          console.warn(`[useTabletopGames] Starter game ${item.id} install error:`, e);
        }
      }
      await refresh();
      return count;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(msg);
      throw err;
    }
  }, [refresh]);

  return {
    games,
    loading,
    importError,
    importFile,
    importFromUrl,
    installStarterPack,
    installCatalogGame,
    saveGame,
    removeGame,
    loadGame,
    refresh,
    exportGameAsJson,
    exportGameAsPcio,
  };
}
