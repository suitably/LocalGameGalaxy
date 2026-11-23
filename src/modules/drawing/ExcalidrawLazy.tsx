import React, { useCallback, useRef, useState } from 'react';
import type { ExcalidrawImperativeAPI, LibraryItems } from '@excalidraw/excalidraw/types';
import type {
  LibraryPersistenceAdapter,
  LibraryPersistedData,
} from '@excalidraw/excalidraw/data/library';
import { ensureStyles } from './excalidrawLazyStyles';
import { storage, STORAGE_KEYS } from '../../lib/storage';

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}

export const ExcalidrawLazy = React.lazy(async () => {
  // fonts come from our own host (copied by vite.config.ts), not from esm.sh (#645)
  window.EXCALIDRAW_ASSET_PATH = `${import.meta.env.BASE_URL}excalidraw/`;
  await ensureStyles();
  const module = await import('@excalidraw/excalidraw');
  if (!module?.Excalidraw) {
    throw new Error('Failed to load Excalidraw module.');
  }

  const ExcalidrawComponent = module.Excalidraw;
  // older builds may not export the hook; a no-op keeps the call unconditional
  const useHandleLibrary: typeof module.useHandleLibrary = module.useHandleLibrary ?? (() => {});

  const adapter: LibraryPersistenceAdapter = {
    load: async () => {
      try {
        const stored = storage.getJson<LibraryItems | LibraryPersistedData | null>(
          STORAGE_KEYS.EXCALIDRAW_LIBRARY,
          null,
        );
        if (stored) {
          if (Array.isArray(stored)) {
            return { libraryItems: stored };
          }
          if ('libraryItems' in stored && stored.libraryItems) {
            return { libraryItems: stored.libraryItems };
          }
        }
        return null;
      } catch (err) {
        console.warn('Failed to load Excalidraw library from storage', err);
      }
      return null;
    },
    save: async (libraryData: LibraryPersistedData) => {
      try {
        storage.setJson(STORAGE_KEYS.EXCALIDRAW_LIBRARY, libraryData);
      } catch (err) {
        console.warn('Failed to save Excalidraw library to storage', err);
      }
    },
  };

  const ExcalidrawWithLibrary: React.FC<Record<string, unknown>> = (props) => {
    const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
    const excalidrawAPIRef = useRef(props.excalidrawAPI);
    excalidrawAPIRef.current = props.excalidrawAPI;

    const handleApi = useCallback((instance: ExcalidrawImperativeAPI) => {
      setApi((prev) => (prev === instance ? prev : instance));
      if (typeof excalidrawAPIRef.current === 'function') {
        (excalidrawAPIRef.current as (api: ExcalidrawImperativeAPI) => void)(instance);
      }
    }, []);

    useHandleLibrary({ excalidrawAPI: api, adapter });

    return (
      <ExcalidrawComponent
        {...props}
        excalidrawAPI={handleApi}
        libraryReturnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
      />
    );
  };

  return { default: ExcalidrawWithLibrary };
});
