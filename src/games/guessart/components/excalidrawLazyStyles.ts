let stylePromise: Promise<void> | null = null;

export const ensureStyles = (): Promise<void> => {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  if (!stylePromise) {
    stylePromise = import('@excalidraw/excalidraw/index.css')
      .then(() => {})
      .catch((error) => {
        console.warn('Failed to load Excalidraw stylesheet', error);
      });
  }

  return stylePromise;
};
