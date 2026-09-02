import React, { useCallback, useState } from 'react';
import { ensureStyles } from './excalidrawLazyStyles';

const STORAGE_KEY = 'guessart_excalidraw_library';

export const ExcalidrawLazy = React.lazy(async () => {
  await ensureStyles();
  const module = await import('@excalidraw/excalidraw');
  if (!module?.Excalidraw) {
    throw new Error('Failed to load Excalidraw module.');
  }

  const ExcalidrawComponent = module.Excalidraw;
  const useHandleLibrary = module.useHandleLibrary;

  const adapter = {
    load: async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch (err) {
        console.warn('Failed to load Excalidraw library from localStorage', err);
      }
      return null;
    },
    save: async (libraryData: unknown) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryData));
      } catch (err) {
        console.warn('Failed to save Excalidraw library to localStorage', err);
      }
    },
  };

  const ExcalidrawWithLibrary: React.FC<Record<string, unknown>> = (props) => {
    const [api, setApi] = useState<unknown>(null);

    const handleApi = useCallback(
      (instance: unknown) => {
        setApi(instance);
        if (typeof props.excalidrawAPI === 'function') {
          (props.excalidrawAPI as (api: unknown) => void)(instance);
        }
      },
      [props]
    );

    if (useHandleLibrary) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHandleLibrary({
        excalidrawAPI: api as never,
        adapter: adapter as never,
      });
    }

    return <ExcalidrawComponent {...props} excalidrawAPI={handleApi} />;
  };

  return { default: ExcalidrawWithLibrary };
});
