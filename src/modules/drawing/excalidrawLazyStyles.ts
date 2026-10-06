import '@excalidraw/excalidraw/index.css';
let stylePromise: Promise<void> | null = null;

export const ensureStyles = (): Promise<void> => {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  if (!stylePromise) {
    stylePromise = Promise.resolve(); // V17+ no longer ships index.css to require
  }

  return stylePromise;
};
