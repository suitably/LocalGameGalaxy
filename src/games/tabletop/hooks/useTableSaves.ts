/**
 * Named table states: save, list, load and delete them on this device or the companion
 * server, and store the table as a server game's default template (#538) or, for device-only
 * and starter games, as this device's default template (#547) [ID: HOOK-TABLETOP-SAVES]
 */
import { useCallback, useEffect, useState } from 'react';
import { storage } from '../../../lib/storage';
import {
  deleteLocalTemplate,
  deleteNamedSave,
  getLocalTemplate,
  getNamedSave,
  listNamedSaves,
  putLocalTemplate,
  putNamedSave,
  type TabletopNamedSaveMeta,
} from '../logic/tabletopStorage';
import {
  deleteServerSave,
  listServerSaves,
  loadServerSave,
  saveStateOnServer,
  saveTemplateOnServer,
  type ServerSaveEntry,
  type ServerSavePermissions,
} from '../logic/tabletopServerApi';
import { supportsLocalTemplate, type TableOrigin } from '../logic/gameSource';
import type { TabletopGameDefinition } from '../logic/types';

export type SaveTarget = 'local' | 'server';

const NO_RIGHTS: ServerSavePermissions = { saveStates: false, saveTemplates: false };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
interface SaveLists {
  local: Result<TabletopNamedSaveMeta[]>;
  /** null when no companion server is configured. */
  server: Result<Awaited<ReturnType<typeof listServerSaves>>> | null;
  /** Whether this device has a default template; null for games without local templates. */
  localTemplate: Result<boolean> | null;
}

const settle = <T>(promise: Promise<T>): Promise<Result<T>> =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    (e: unknown) => ({ ok: false as const, error: message(e) }),
  );

const loadLists = async (
  gameId: string,
  withServer: boolean,
  withTemplate: boolean,
): Promise<SaveLists> => {
  const [local, server, localTemplate] = await Promise.all([
    settle(listNamedSaves(gameId)),
    withServer ? settle(listServerSaves(gameId)) : Promise.resolve(null),
    withTemplate
      ? settle(getLocalTemplate(gameId).then((tpl) => tpl !== null))
      : Promise.resolve(null),
  ]);
  return { local, server, localTemplate };
};

export function useTableSaves(
  game: TabletopGameDefinition,
  origin: TableOrigin | null,
  onLoad: (game: TabletopGameDefinition) => void,
  active: boolean,
) {
  const gameId = game.id;
  const serverAvailable = storage.isHelperActive();
  const localTemplateAllowed = supportsLocalTemplate(origin);
  const [hasLocalTemplate, setHasLocalTemplate] = useState(false);
  const [localSaves, setLocalSaves] = useState<TabletopNamedSaveMeta[]>([]);
  const [serverSaves, setServerSaves] = useState<ServerSaveEntry[]>([]);
  const [permissions, setPermissions] = useState<ServerSavePermissions>(NO_RIGHTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Listing the server's saves failed (offline, or an older server without save routes). */
  const [serverError, setServerError] = useState<string | null>(null);

  const applyLists = useCallback((lists: SaveLists) => {
    if (lists.local.ok) setLocalSaves(lists.local.value);
    else setError(lists.local.error);
    if (lists.localTemplate?.ok) setHasLocalTemplate(lists.localTemplate.value);
    if (lists.server === null) return;
    if (lists.server.ok) {
      setServerSaves(lists.server.value.saves);
      setPermissions(lists.server.value.permissions ?? NO_RIGHTS);
      setServerError(null);
    } else {
      // local saves keep working without the server
      setServerSaves([]);
      setPermissions(NO_RIGHTS);
      setServerError(lists.server.error);
    }
  }, []);

  const refresh = useCallback(
    () => loadLists(gameId, serverAvailable, localTemplateAllowed).then(applyLists),
    [gameId, serverAvailable, localTemplateAllowed, applyLists],
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    loadLists(gameId, serverAvailable, localTemplateAllowed).then((lists) => {
      if (!cancelled) applyLists(lists);
    });
    return () => {
      cancelled = true;
    };
  }, [active, gameId, serverAvailable, localTemplateAllowed, applyLists]);

  /** Runs one action with busy/error handling; resolves true on success. */
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = (target: SaveTarget, name: string, overwriteId?: string) =>
    run(() =>
      target === 'local'
        ? putNamedSave({ id: overwriteId ?? newId(), gameId, name: name.trim(), game })
        : saveStateOnServer(game, name.trim(), overwriteId),
    );

  const load = (target: SaveTarget, id: string) =>
    run(async () => {
      const loaded = target === 'local' ? (await getNamedSave(id))?.game : await loadServerSave(id);
      if (!loaded) throw new Error('Save not found');
      // keep the id of the running game, so autosave and resume stay on this table
      onLoad({ ...loaded, id: gameId });
    });

  const remove = (target: SaveTarget, id: string) =>
    run(() => (target === 'local' ? deleteNamedSave(id) : deleteServerSave(id)));

  const saveTemplate = () => run(() => saveTemplateOnServer(game));
  const saveLocalTemplate = () => run(() => putLocalTemplate(game));
  const resetLocalTemplate = () => run(() => deleteLocalTemplate(gameId));

  return {
    serverAvailable,
    localSaves,
    serverSaves,
    permissions,
    busy,
    error,
    serverError,
    save,
    load,
    remove,
    saveTemplate,
    localTemplateAllowed,
    hasLocalTemplate,
    saveLocalTemplate,
    resetLocalTemplate,
  };
}

export type TableSaves = ReturnType<typeof useTableSaves>;
