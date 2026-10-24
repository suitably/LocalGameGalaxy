/**
 * Game manager actions: server games and games on this device, with save-to-server [ID: HOOK-TABLETOP-MANAGER]
 */
import { useCallback, useEffect, useState } from 'react';
import { useTabletopGames } from './useTabletopGames';
import {
  deleteTabletopGame,
  getTabletopGame,
  listTabletopGames,
  saveTabletopGame,
} from '../logic/tabletopStorage';
import { deleteGameOnServer, saveGameOnServer } from '../logic/tabletopServerApi';
import type { TabletopGameDefinition, TabletopGameSummary } from '../logic/types';

/** Where a listed game lives: the companion server's library or this device's IndexedDB. */
export type GameSource = 'server' | 'local';

export type ManagerNotice =
  | { kind: 'saved'; name: string }
  | { kind: 'saved_copy'; name: string }
  | { kind: 'error'; error: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useGameManager(open: boolean) {
  const server = useTabletopGames();
  const { serverConnected, games: serverGames, refresh, loadGameFromServer } = server;
  const [localGames, setLocalGames] = useState<TabletopGameSummary[]>([]);
  const [editing, setEditing] = useState<{
    game: TabletopGameDefinition;
    source: GameSource;
    id: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<ManagerNotice | null>(null);

  const reloadLocal = useCallback(() => {
    listTabletopGames()
      .then(setLocalGames)
      .catch(() => setLocalGames([]));
  }, []);
  useEffect(() => {
    if (open) reloadLocal();
  }, [open, reloadLocal]);

  const fetchFull = useCallback(
    async (id: string, source: GameSource): Promise<TabletopGameDefinition | null> => {
      if (source === 'server' && serverConnected) {
        try {
          return await loadGameFromServer(id);
        } catch {
          // fall back to a copy on this device
        }
      }
      return getTabletopGame(id);
    },
    [serverConnected, loadGameFromServer],
  );

  /** Runs a server action for one game, with its card busy and failures shown as a notice. */
  const withBusy = useCallback(async (id: string, task: () => Promise<ManagerNotice | null>) => {
    setBusyId(id);
    setNotice(null);
    try {
      setNotice(await task());
    } catch (e) {
      setNotice({ kind: 'error', error: errorText(e) });
    } finally {
      setBusyId(null);
    }
  }, []);

  /** Moves a game from this device into the server library (playing it keeps a copy here again). */
  const saveToServer = (id: string) =>
    withBusy(id, async () => {
      const full = await getTabletopGame(id);
      if (!full) throw new Error('not found');
      const entry = await saveGameOnServer(full);
      await deleteTabletopGame(id);
      reloadLocal();
      await refresh();
      return { kind: 'saved', name: entry.name };
    });

  /** Server games: saved ones are overwritten, read-only ones get a saved copy. */
  const saveEdit = (game: TabletopGameDefinition) => {
    const current = editing;
    setEditing(null);
    if (!current) return Promise.resolve();
    if (current.source === 'local' || !serverConnected) {
      return saveTabletopGame(game).then(reloadLocal);
    }
    const summary = serverGames.find((g) => g.id === current.id);
    return withBusy(current.id, async () => {
      const entry = await saveGameOnServer(game, summary?.serverSaved ? current.id : undefined);
      await refresh();
      return { kind: summary?.serverSaved ? 'saved' : 'saved_copy', name: entry.name };
    });
  };

  const remove = (id: string, source: GameSource) =>
    source === 'server'
      ? withBusy(id, async () => {
          await deleteGameOnServer(id);
          await refresh();
          return null;
        })
      : deleteTabletopGame(id).then(reloadLocal);

  const startEdit = async (id: string, source: GameSource) => {
    const game = await fetchFull(id, source);
    if (game) setEditing({ game, source, id });
  };

  /** Keeps a copy on this device before playing, so the game also runs offline. */
  const prepareToPlay = async (id: string, source: GameSource) => {
    try {
      const full = await fetchFull(id, source);
      if (full) await saveTabletopGame(full);
    } catch {
      // playing still works from the server
    }
  };

  return {
    server,
    // copies of server games (kept for offline play) are listed with the server's games
    localGames: localGames.filter((g) => !serverGames.some((s) => s.id === g.id)),
    editing: editing?.game ?? null,
    busyId,
    notice,
    clearNotice: () => setNotice(null),
    fetchFull,
    reloadLocal,
    saveToServer,
    saveEdit,
    cancelEdit: () => setEditing(null),
    startEdit,
    remove,
    prepareToPlay,
  };
}
