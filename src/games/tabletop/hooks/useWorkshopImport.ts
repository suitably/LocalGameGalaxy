/**
 * Hook for importing Tabletop Simulator Workshop mods [ID: HOOK-WORKSHOP-IMPORT]
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { parsePcioFile } from '../logic/pcioParser';
import { parseTtsSaveFile } from '../logic/ttsParser';
import { saveTabletopGame } from '../logic/tabletopStorage';
import { withCachedImages } from '../logic/gameAssetCache';
import { storeWorkshopGameOnServer } from '../logic/tabletopServerApi';
import {
  extractWorkshopId,
  fetchWorkshopDetails,
  downloadWorkshopMod,
  downloadWorkshopModDirect,
  WorkshopError,
} from '../logic/steamWorkshopApi';
import type { WorkshopItemDetails } from '../logic/steamWorkshopApi';
import type { TabletopGameDefinition } from '../logic/types';
import type { TTSSaveFile } from '../logic/ttsTypes';

export type WorkshopImportStatus =
  | 'idle'
  | 'loading_meta'
  | 'meta_loaded'
  | 'downloading'
  | 'parsing'
  | 'storing'
  | 'caching'
  | 'success'
  | 'error';

export interface WorkshopImportState {
  status: WorkshopImportStatus;
  meta: WorkshopItemDetails | null;
  game: TabletopGameDefinition | null;
  error: string | null;
  serverAvailable: boolean;
  /** Images cached so far while `status === 'caching'` (#693). */
  progress: { done: number; total: number } | null;
  /** Stored in the companion library for everyone who uses it (#702). */
  storedOnServer: boolean;
  /** Why storing on the companion failed (the game was saved on this device only). */
  serverError: string | null;
}

export function useWorkshopImport() {
  const { t } = useTranslation();
  const errorText = useCallback(
    (err: unknown): string =>
      err instanceof WorkshopError
        ? err.companion
          ? t(`games.tabletop.workshop.error_companion_${err.companion.reason}`, {
              url: err.companion.url,
              status: err.companion.status ?? '',
            })
          : t(`games.tabletop.workshop.error_${err.code}`, { status: err.status ?? '' })
        : err instanceof Error
          ? err.message
          : String(err),
    [t],
  );
  const [state, setState] = useState<WorkshopImportState>({
    status: 'idle',
    meta: null,
    game: null,
    error: null,
    serverAvailable: storage.isHelperActive(),
    progress: null,
    storedOnServer: false,
    serverError: null,
  });

  /** Caches the game's images on this device (with progress), then saves it. */
  const cacheAndSave = useCallback(async (parsed: TabletopGameDefinition) => {
    setState((s) => ({ ...s, status: 'caching', progress: null }));
    const game = await withCachedImages(parsed, (done, total) =>
      setState((s) => ({ ...s, progress: { done, total } })),
    );
    await saveTabletopGame(game);
    setState((s) => ({ ...s, status: 'success', game, progress: null }));
  }, []);

  /**
   * With a companion, the game is stored there for everyone who uses it (#702); the copy on this
   * device then carries the server id, so it is listed with the server's games.
   */
  const storeOnCompanion = useCallback(
    async (workshopId: string, parsed: TabletopGameDefinition) => {
      if (!storage.isHelperActive()) return parsed;
      setState((s) => ({ ...s, status: 'storing' }));
      try {
        const entry = await storeWorkshopGameOnServer(workshopId, parsed);
        setState((s) => ({ ...s, storedOnServer: true }));
        return { ...parsed, id: entry.id };
      } catch (err) {
        // the import still works on this device
        setState((s) => ({ ...s, serverError: errorText(err) }));
        return parsed;
      }
    },
    [errorText],
  );

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      meta: null,
      game: null,
      error: null,
      serverAvailable: storage.isHelperActive(),
      progress: null,
      storedOnServer: false,
      serverError: null,
    });
  }, []);

  /** Fetch workshop metadata from Steam via server proxy or direct proxy */
  const loadMeta = useCallback(
    async (urlOrId: string) => {
      const workshopId = extractWorkshopId(urlOrId);
      if (!workshopId) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: errorText(new WorkshopError('invalid_input')),
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: 'loading_meta',
        error: null,
        meta: null,
        game: null,
        storedOnServer: false,
        serverError: null,
      }));

      try {
        const baseUrl = storage.isHelperActive()
          ? storage.getHelperUrl().replace(/\/$/, '')
          : undefined;
        const token = storage.isHelperActive() ? storage.getHelperToken() : undefined;
        // An unreachable server at the default address means "no companion", not an error.
        const configured = Boolean(storage.get(STORAGE_KEYS.HELPER_URL));
        const meta = await fetchWorkshopDetails(workshopId, baseUrl, token, configured);
        setState((s) => ({ ...s, status: 'meta_loaded', meta }));
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: errorText(err),
        }));
      }
    },
    [errorText],
  );

  /** Download and parse the workshop mod via server or direct Steam CDN */
  const importWorkshop = useCallback(async () => {
    if (!state.meta?.id) return;

    setState((s) => ({ ...s, status: 'downloading', error: null }));

    try {
      let save: TTSSaveFile | null = null;

      // Path A: the companion only fetches the save file (JSON or BSON) and stores nothing (#702)
      if (storage.isHelperActive()) {
        try {
          const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
          save = await downloadWorkshopMod(state.meta.id, baseUrl, storage.getHelperToken());
        } catch {
          // Companion server failed/unreachable - fall through to direct browser download
        }
      }

      // Path B: Direct download from Steam CDN (has Access-Control-Allow-Origin: *)
      if (!save && state.meta.fileUrl) {
        save = await downloadWorkshopModDirect(state.meta.fileUrl);
      }

      if (!save) {
        throw new WorkshopError('no_download_url');
      }

      // Both paths convert and cache on this device the same way
      setState((s) => ({ ...s, status: 'parsing' }));
      const parsed = parseTtsSaveFile(save, { defaultName: state.meta.title });
      await cacheAndSave(await storeOnCompanion(state.meta.id, parsed));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: errorText(err),
      }));
    }
  }, [state.meta, errorText, cacheAndSave, storeOnCompanion]);

  /** Parse a manually uploaded TTS JSON file */
  const importFromFile = useCallback(
    async (file: File) => {
      setState((s) => ({ ...s, status: 'parsing', error: null }));

      try {
        // A TTS/VTT JSON file is text; .vtt/.pcio/.zip archives carry their images along.
        const isJson = /\.json$/i.test(file.name);
        const source = isJson ? await file.text() : await file.arrayBuffer();
        const game = await parsePcioFile(source, {
          defaultName: file.name.replace(/\.(json|vtt|pcio|zip)$/i, ''),
        });
        await cacheAndSave(game);
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: errorText(err),
        }));
      }
    },
    [errorText, cacheAndSave],
  );

  return {
    ...state,
    loadMeta,
    importViaServer: importWorkshop,
    importFromFile,
    reset,
  };
}
