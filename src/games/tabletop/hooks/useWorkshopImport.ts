/**
 * Hook for importing Tabletop Simulator Workshop mods [ID: HOOK-WORKSHOP-IMPORT]
 */
import { useState, useCallback } from 'react';
import { storage } from '../../../lib/storage';
import { parsePcioFile } from '../logic/pcioParser';
import { saveTabletopGame } from '../logic/tabletopStorage';
import {
  extractWorkshopId,
  fetchWorkshopDetails,
  downloadWorkshopMod,
} from '../logic/steamWorkshopApi';
import type { WorkshopItemDetails } from '../logic/steamWorkshopApi';
import type { TabletopGameDefinition } from '../logic/types';

export type WorkshopImportStatus =
  | 'idle'
  | 'loading_meta'
  | 'meta_loaded'
  | 'downloading'
  | 'parsing'
  | 'success'
  | 'error';

export interface WorkshopImportState {
  status: WorkshopImportStatus;
  meta: WorkshopItemDetails | null;
  game: TabletopGameDefinition | null;
  error: string | null;
  serverAvailable: boolean;
}

export function useWorkshopImport() {
  const [state, setState] = useState<WorkshopImportState>({
    status: 'idle',
    meta: null,
    game: null,
    error: null,
    serverAvailable: storage.isHelperActive(),
  });

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      meta: null,
      game: null,
      error: null,
      serverAvailable: storage.isHelperActive(),
    });
  }, []);

  /** Fetch workshop metadata from Steam via server proxy */
  const loadMeta = useCallback(async (urlOrId: string) => {
    const workshopId = extractWorkshopId(urlOrId);
    if (!workshopId) {
      setState((s) => ({ ...s, status: 'error', error: 'Ungültige Steam Workshop URL' }));
      return;
    }

    if (!storage.isHelperActive()) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'Kein Server verbunden — Workshop-Import benötigt den Companion Server',
        serverAvailable: false,
      }));
      return;
    }

    setState((s) => ({ ...s, status: 'loading_meta', error: null, meta: null, game: null }));

    try {
      const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
      const token = storage.getHelperToken();
      const meta = await fetchWorkshopDetails(workshopId, baseUrl, token);
      setState((s) => ({ ...s, status: 'meta_loaded', meta }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  /** Download and parse the workshop mod via server */
  const importViaServer = useCallback(async () => {
    if (!state.meta?.id) return;

    const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
    const token = storage.getHelperToken();

    setState((s) => ({ ...s, status: 'downloading', error: null }));

    try {
      const data = await downloadWorkshopMod(state.meta.id, baseUrl, token);

      setState((s) => ({ ...s, status: 'parsing' }));

      const game = await parsePcioFile(data.rawJson, {
        assetFiles: data.assetMap,
        defaultName: state.meta.title,
      });

      await saveTabletopGame(game);

      setState((s) => ({ ...s, status: 'success', game }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [state.meta]);

  /** Parse a manually uploaded TTS JSON file */
  const importFromFile = useCallback(async (file: File) => {
    setState((s) => ({ ...s, status: 'parsing', error: null }));

    try {
      const text = await file.text();
      const game = await parsePcioFile(text, { defaultName: file.name.replace(/\.json$/i, '') });
      await saveTabletopGame(game);
      setState((s) => ({ ...s, status: 'success', game }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  return {
    ...state,
    loadMeta,
    importViaServer,
    importFromFile,
    reset,
  };
}
