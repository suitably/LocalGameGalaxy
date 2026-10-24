import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';
import { useTranslation } from 'react-i18next';
import { buildSceneFingerprint, getOrderedElements, parseSceneData } from './excalidrawScene';
import { ExcalidrawLazy } from './ExcalidrawLazy';
import {
  buildAnimationPlan,
  buildElementsForProgress,
  cleanViewerAppState,
  type DrawingElement,
} from './excalidrawAnimation';
import { hiddenExcalidrawChromeSx } from './excalidrawViewerStyles';
import { useViewerFit, type ExcalidrawViewerApi } from './useViewerFit';

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
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawViewerApi | null>(null);

  const [progressSegments, setProgressSegments] = useState<number>(() =>
    animate ? 0 : animationPlan.totalSegments,
  );
  const skipAnimationRef = useRef<boolean>(!animate);
  const containerRef = useRef<HTMLDivElement>(null);

  const segmentsPerMs = (BASE_SEGMENTS_PER_SECOND * STROKE_SPEED_MULTIPLIER) / 1000;

  useEffect(() => {
    if (!animate) {
      skipAnimationRef.current = true;
      const frameId = requestAnimationFrame(() => {
        setProgressSegments(animationPlan.totalSegments);
      });
      return () => cancelAnimationFrame(frameId);
    }

    skipAnimationRef.current = false;
    const initFrameId = requestAnimationFrame(() => {
      setProgressSegments(0);
    });

    if (!hasElements || animationPlan.totalSegments <= 0) {
      return () => cancelAnimationFrame(initFrameId);
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
      cancelAnimationFrame(initFrameId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [animate, hasElements, animationPlan.totalSegments, segmentsPerMs, sceneKey]);

  const elementsToRender = useMemo(() => {
    if (!hasElements) return [];
    if (!animate || progressSegments >= animationPlan.totalSegments) return orderedElements;
    return buildElementsForProgress(animationPlan, progressSegments);
  }, [animate, hasElements, orderedElements, animationPlan, progressSegments]);

  useViewerFit({
    api: excalidrawAPI,
    containerRef,
    elementsToRender,
    orderedElements,
    scene,
    sceneKey,
    viewportZoomFactor,
  });

  const initialAppState = useMemo(() => cleanViewerAppState(scene.appState), [scene.appState]);

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
        ...hiddenExcalidrawChromeSx,
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
            borderRadius: 5,
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
          initialData={
            {
              elements: initialElements,
              appState: initialAppState,
              files: scene.files || {},
            } as Record<string, unknown>
          }
          viewModeEnabled
          zenModeEnabled
          gridModeEnabled={false}
          UIOptions={EXCALIDRAW_VIEWER_UI_OPTIONS}
          excalidrawAPI={(api: unknown) => {
            if (!api) return;
            setExcalidrawAPI(api as ExcalidrawViewerApi);
          }}
        />
      </React.Suspense>
    </Box>
  );
};
