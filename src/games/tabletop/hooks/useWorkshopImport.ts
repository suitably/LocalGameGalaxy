/**
 * Hook for importing Tabletop Simulator Workshop mods [ID: HOOK-WORKSHOP-IMPORT]
 */
import { useState, useCallback } from 'react';
import { storage } from '../../../lib/storage';
import { parsePcioFile } from '../logic/pcioParser';
import { parseTtsSaveFile } from '../logic/ttsParser';
import { saveTabletopGame } from '../logic/tabletopStorage';
import {
  extractWorkshopId,
  fetchWorkshopDetails,
  downloadWorkshopMod,
  downloadWorkshopModDirect,
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

  /** Fetch workshop metadata from Steam via server proxy or direct proxy */
  const loadMeta = useCallback(async (urlOrId: string) => {
    const workshopId = extractWorkshopId(urlOrId);
    if (!workshopId) {
      setState((s) => ({ ...s, status: 'error', error: 'Ungültige Steam Workshop URL oder ID' }));
      return;
    }

    setState((s) => ({ ...s, status: 'loading_meta', error: null, meta: null, game: null }));

    try {
      const baseUrl = storage.isHelperActive() ? storage.getHelperUrl().replace(/\/$/, '') : undefined;
      const token = storage.isHelperActive() ? storage.getHelperToken() : undefined;
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

  /** Download and parse the workshop mod via server or direct Steam CDN */
  const importWorkshop = useCallback(async () => {
    if (!state.meta?.id) return;

    setState((s) => ({ ...s, status: 'downloading', error: null }));

    try {
      let game: TabletopGameDefinition | null = null;

      // Path A: Try companion server first if configured
      if (storage.isHelperActive()) {
        try {
          const baseUrl = storage.getHelperUrl().replace(/\/$/, '');
          const token = storage.getHelperToken();
          const data = await downloadWorkshopMod(state.meta.id, baseUrl, token);

          setState((s) => ({ ...s, status: 'parsing' }));
          game = await parsePcioFile(data.rawJson, {
            assetFiles: data.assetMap,
            defaultName: state.meta.title,
          });
        } catch {
          // Companion server failed/unreachable - fall through to direct browser download
        }
      }

      // Path B: Direct download from Steam CDN (has Access-Control-Allow-Origin: *)
      if (!game && state.meta.fileUrl) {
        setState((s) => ({ ...s, status: 'downloading' }));
        const decoded = await downloadWorkshopModDirect(state.meta.fileUrl);
        setState((s) => ({ ...s, status: 'parsing' }));
        game = parseTtsSaveFile(decoded as TTSSaveFile, { defaultName: state.meta.title });
      }

      if (!game) {
        throw new Error('Mod-Download fehlgeschlagen — keine gültige Download-URL');
      }

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
    importViaServer: importWorkshop,
    importFromFile,
    reset,
  };
}
