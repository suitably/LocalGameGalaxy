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

  return {
    games,
    loading,
    importError,
    importFile,
    saveGame,
    removeGame,
    loadGame,
    refresh,
    exportGameAsJson,
    exportGameAsPcio,
  };
}
