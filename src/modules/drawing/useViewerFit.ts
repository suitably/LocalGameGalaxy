import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ExcalidrawScenePayload } from './excalidrawScene';
import { cleanViewerAppState, type DrawingElement } from './excalidrawAnimation';

export interface ExcalidrawViewerApi {
  updateScene: (scene: ExcalidrawScenePayload) => void;
  scrollToContent?: (elements: unknown[], options?: Record<string, unknown>) => void;
}

interface UseViewerFitOptions {
  api: ExcalidrawViewerApi | null;
  containerRef: RefObject<HTMLDivElement | null>;
  elementsToRender: DrawingElement[];
  orderedElements: DrawingElement[];
  scene: ExcalidrawScenePayload;
  sceneKey: string;
  viewportZoomFactor: number;
}

/** Pushes the (animated) elements into Excalidraw and keeps the drawing fitted to the viewport. */
export function useViewerFit({
  api,
  containerRef,
  elementsToRender,
  orderedElements,
  scene,
  sceneKey,
  viewportZoomFactor,
}: UseViewerFitOptions) {
  const hasFittedForSceneRef = useRef<string | null>(null);

  const fitToViewport = useCallback(() => {
    if (!api || typeof api.scrollToContent !== 'function' || orderedElements.length === 0) return;
    const el = containerRef.current;
    if (el && (el.clientWidth === 0 || el.clientHeight === 0)) {
      return;
    }
    try {
      api.scrollToContent(orderedElements, {
        fitToViewport: true,
        viewportZoomFactor,
        animate: false,
      });
    } catch (e) {
      console.warn('Excalidraw scrollToContent error', e);
    }
  }, [api, containerRef, orderedElements, viewportZoomFactor]);

  useEffect(() => {
    if (!api || typeof api.updateScene !== 'function') return;
    api.updateScene({
      elements: elementsToRender,
      appState: cleanViewerAppState(scene.appState),
      files: scene.files || {},
    });

    if (hasFittedForSceneRef.current !== sceneKey) {
      hasFittedForSceneRef.current = sceneKey;
      fitToViewport();
    }
  }, [elementsToRender, api, scene, fitToViewport, sceneKey]);

  // Robust observer for viewport centering on mount, dialog/accordion expansion, and resize
  useEffect(() => {
    fitToViewport();

    const el = containerRef.current;
    if (!el) return undefined;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        fitToViewport();
      });
      resizeObserver.observe(el);
    }

    const timer1 = setTimeout(fitToViewport, 50);
    const timer2 = setTimeout(fitToViewport, 150);
    const timer3 = setTimeout(fitToViewport, 350);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [fitToViewport, sceneKey, containerRef]);
}
