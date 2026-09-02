import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';
import { useTranslation } from 'react-i18next';
import {
  buildSceneFingerprint,
  getOrderedElements,
  parseSceneData,
  type ExcalidrawScenePayload,
} from '../logic/excalidrawScene';
import { ExcalidrawLazy } from './ExcalidrawLazy';

interface ExcalidrawViewerProps {
  data: string | null | undefined;
  height?: string | number;
  width?: string | number;
  showSkipButton?: boolean;
  animate?: boolean;
  viewportZoomFactor?: number;
}

const EXCALIDRAW_VIEWER_UI_OPTIONS = {
  canvasActions: {
    changeViewBackgroundColor: false,
    clearCanvas: false,
    export: false,
    loadScene: false,
    saveAsImage: false,
    saveToActiveFile: false,
    theme: false,
    toggleTheme: false,
  },
  tools: {
    image: false,
  },
  dockedSidebarBreakpoint: 0,
} as const;

const BASE_DELAY_MS = 200;
const BASE_SEGMENTS_PER_SECOND = 1000 / BASE_DELAY_MS;
const STROKE_SPEED_MULTIPLIER = 12;

interface DrawingElement {
  id?: string;
  type?: string;
  isDeleted?: boolean;
  points?: [number, number][];
  [key: string]: unknown;
}

interface AnimationEntry {
  element: DrawingElement;
  segments: number;
  start: number;
  end: number;
}

const buildAnimationPlan = (elements: DrawingElement[]) => {
  let cumulative = 0;
  const entries: AnimationEntry[] = elements.map((element) => {
    const pointsCount = Array.isArray(element.points) ? Math.max(1, element.points.length - 1) : 1;
    const start = cumulative;
    cumulative += pointsCount;
    return {
      element,
      segments: pointsCount,
      start,
      end: cumulative,
    };
  });
  return { entries, totalSegments: cumulative };
};

const buildElementsForProgress = (plan: { entries: AnimationEntry[]; totalSegments: number }, progress: number) => {
  const elements: DrawingElement[] = [];
  for (const entry of plan.entries) {
    if (progress >= entry.end) {
      elements.push(entry.element);
      continue;
    }
    if (progress <= entry.start) {
      break;
    }
    const consumed = Math.max(0, progress - entry.start);
    if (entry.element.type === 'freedraw' && Array.isArray(entry.element.points)) {
      const whole = Math.floor(consumed);
      const points = entry.element.points.slice(0, Math.max(2, whole + 1)) as [number, number][];
      elements.push({
        ...entry.element,
        points,
      });
    } else {
      elements.push(entry.element);
    }
  }
  return elements;
};

const cleanViewerAppState = (appState?: Record<string, unknown>): Record<string, unknown> => {
  if (!appState || typeof appState !== 'object') {
    return {
      viewModeEnabled: true,
      zenModeEnabled: true,
      selectedElementIds: {},
      selectedGroupIds: {},
      editingElement: null,
      draggingElement: null,
      selectedLinearElement: null,
      editingLinearElement: null,
      selectionElement: null,
    };
  }
  const cloned = { ...appState };
  delete cloned.scrollX;
  delete cloned.scrollY;
  delete cloned.zoom;
  delete cloned.width;
  delete cloned.height;
  delete cloned.offsetLeft;
  delete cloned.offsetTop;
  return {
    ...cloned,
    viewModeEnabled: true,
    zenModeEnabled: true,
    selectedElementIds: {},
    selectedGroupIds: {},
    editingElement: null,
    draggingElement: null,
    selectedLinearElement: null,
    editingLinearElement: null,
    selectionElement: null,
  };
};

export const ExcalidrawViewer: React.FC<ExcalidrawViewerProps> = ({
  data,
  height = '100%',
  width = '100%',
  showSkipButton = true,
  animate = true,
  viewportZoomFactor = 0.85,
}) => {
  const { t } = useTranslation();
  const scene = useMemo(() => parseSceneData(data), [data]);
  const orderedElements = useMemo(() => getOrderedElements(scene) as DrawingElement[], [scene]);
  const sceneKey = useMemo(() => buildSceneFingerprint(scene), [scene]);
  const hasElements = orderedElements.length > 0;

  const animationPlan = useMemo(() => buildAnimationPlan(orderedElements), [orderedElements]);
  const [excalidrawAPI, setExcalidrawAPI] = useState<{
    updateScene: (scene: ExcalidrawScenePayload) => void;
    scrollToContent?: (elements: unknown[], options?: Record<string, unknown>) => void;
  } | null>(null);

  const [progressSegments, setProgressSegments] = useState<number>(() =>
    animate ? 0 : animationPlan.totalSegments,
  );
  const skipAnimationRef = useRef<boolean>(!animate);
  const containerRef = useRef<HTMLDivElement>(null);

  const segmentsPerMs = (BASE_SEGMENTS_PER_SECOND * STROKE_SPEED_MULTIPLIER) / 1000;

  useEffect(() => {
    if (!animate) {
      skipAnimationRef.current = true;
      setProgressSegments(animationPlan.totalSegments);
      return undefined;
    }

    skipAnimationRef.current = false;
    setProgressSegments(0);

    if (!hasElements || animationPlan.totalSegments <= 0) {
      return undefined;
    }

    let frameId: number | null = null;
    const startTimestamp = performance.now();

    const step = (timestamp: number) => {
      if (skipAnimationRef.current) {
        setProgressSegments(animationPlan.totalSegments);
        return;
      }
      const elapsed = timestamp - startTimestamp;
      const nextProgress = elapsed * segmentsPerMs;
      if (nextProgress >= animationPlan.totalSegments) {
        setProgressSegments(animationPlan.totalSegments);
        return;
      }
      setProgressSegments(nextProgress);
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [animate, hasElements, animationPlan.totalSegments, segmentsPerMs, sceneKey]);

  const elementsToRender = useMemo(() => {
    if (!hasElements) return [];
    if (!animate || progressSegments >= animationPlan.totalSegments) return orderedElements;
    return buildElementsForProgress(animationPlan, progressSegments);
  }, [animate, hasElements, orderedElements, animationPlan, progressSegments]);

  const hasFittedForSceneRef = useRef<string | null>(null);

  const fitToViewport = useCallback(() => {
    if (!excalidrawAPI || typeof excalidrawAPI.scrollToContent !== 'function' || orderedElements.length === 0) return;
    const el = containerRef.current;
    if (el && (el.clientWidth === 0 || el.clientHeight === 0)) {
      return;
    }
    try {
      excalidrawAPI.scrollToContent(orderedElements, {
        fitToViewport: true,
        viewportZoomFactor,
        animate: false,
      });
    } catch (e) {
      console.warn('Excalidraw scrollToContent error', e);
    }
  }, [excalidrawAPI, orderedElements, viewportZoomFactor]);

  useEffect(() => {
    if (!excalidrawAPI || typeof excalidrawAPI.updateScene !== 'function') return;
    excalidrawAPI.updateScene({
      elements: elementsToRender,
      appState: cleanViewerAppState(scene.appState),
      files: scene.files || {},
    });

    if (hasFittedForSceneRef.current !== sceneKey) {
      hasFittedForSceneRef.current = sceneKey;
      fitToViewport();
    }
  }, [elementsToRender, excalidrawAPI, scene, fitToViewport, sceneKey]);

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
  }, [fitToViewport, sceneKey]);

  const initialAppState = useMemo(
    () => cleanViewerAppState(scene.appState),
    [scene.appState],
  );

  const initialElements = useMemo(
    () => (animate ? [] : orderedElements),
    [animate, orderedElements],
  );

  const isAnimating = animate && hasElements && progressSegments < animationPlan.totalSegments;

  return (
    <Box
      ref={containerRef}
      sx={{
        width,
        height,
        position: 'relative',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '& .excalidraw': {
          '& .layer-ui__wrapper': {
            display: 'none !important',
            pointerEvents: 'none !important',
          },
          '& .App-menu': {
            display: 'none !important',
          },
          '& .App-top-bar': {
            display: 'none !important',
          },
          '& .App-bottom-bar': {
            display: 'none !important',
          },
          '& .App-toolbar': {
            display: 'none !important',
          },
          '& .dropdown-menu-button': {
            display: 'none !important',
          },
          '& .main-menu-trigger': {
            display: 'none !important',
          },
          '& .zen-mode-transition': {
            display: 'none !important',
          },
          '& .disable-zen-mode': {
            display: 'none !important',
          },
          '& footer': {
            display: 'none !important',
          },
        },
      }}
    >
      {showSkipButton && isAnimating && (
        <Button
          variant="contained"
          size="small"
          startIcon={<FastForwardRoundedIcon />}
          onClick={() => {
            skipAnimationRef.current = true;
            setProgressSegments(animationPlan.totalSegments);
          }}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            borderRadius: 8,
            textTransform: 'none',
            bgcolor: 'rgba(0,0,0,0.6)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
          }}
        >
          {t('guessart.skipAnimation', 'Animation überspringen')}
        </Button>
      )}

      <React.Suspense
        fallback={
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <CircularProgress size={32} />
          </Box>
        }
      >
        <ExcalidrawLazy
          initialData={{
            elements: initialElements,
            appState: initialAppState,
            files: scene.files || {},
          } as Record<string, unknown>}
          viewModeEnabled
          zenModeEnabled
          gridModeEnabled={false}
          UIOptions={EXCALIDRAW_VIEWER_UI_OPTIONS}
          excalidrawAPI={(api: unknown) => {
            if (!api) return;
            setExcalidrawAPI(
              api as {
                updateScene: (scene: ExcalidrawScenePayload) => void;
                scrollToContent?: (elements: unknown[], options?: Record<string, unknown>) => void;
              },
            );
          }}
        />
      </React.Suspense>
    </Box>
  );
};
