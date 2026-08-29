import React from 'react';
import { ensureStyles } from './excalidrawLazyStyles';

export const ExcalidrawLazy = React.lazy(async () => {
  await ensureStyles();
  const module = await import('@excalidraw/excalidraw');
  if (!module?.Excalidraw) {
    throw new Error('Failed to load Excalidraw module.');
  }
  return { default: module.Excalidraw };
});
